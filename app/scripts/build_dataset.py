from __future__ import annotations

import json
import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import pyarrow.parquet as pq


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT.parent / "player_data" / "player_data"
PUBLIC_ROOT = ROOT / "public"
DATA_ROOT = PUBLIC_ROOT / "data"
MATCHES_ROOT = DATA_ROOT / "matches"

MAP_CONFIG = {
    "AmbroseValley": {
        "scale": 900,
        "origin_x": -370,
        "origin_z": -473,
        "image": "AmbroseValley_Minimap.png",
    },
    "GrandRift": {
        "scale": 581,
        "origin_x": -290,
        "origin_z": -290,
        "image": "GrandRift_Minimap.png",
    },
    "Lockdown": {
        "scale": 1000,
        "origin_x": -500,
        "origin_z": -500,
        "image": "Lockdown_Minimap.jpg",
    },
}

MOVEMENT_EVENTS = {"Position", "BotPosition"}
KILL_EVENTS = {"Kill", "BotKill"}
DEATH_EVENTS = {"Killed", "BotKilled"}
STORM_EVENTS = {"KilledByStorm"}
LOOT_EVENTS = {"Loot"}
HEATMAP_TYPES = ("traffic", "kills", "deaths")
GRID_SIZE = 48
IMAGE_SIZE = 1024
UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


@dataclass
class PlayerRecord:
    user_id: str
    is_bot: bool
    positions: list[dict]
    events: list[dict]
    counts: Counter


def iso_date_from_folder(folder_name: str) -> str:
    parsed = datetime.strptime(f"{folder_name} 2026", "%B_%d %Y")
    return parsed.strftime("%Y-%m-%d")


def to_pixel(map_id: str, world_x: float, world_z: float) -> tuple[float, float]:
    config = MAP_CONFIG[map_id]
    u = (world_x - config["origin_x"]) / config["scale"]
    v = (world_z - config["origin_z"]) / config["scale"]
    pixel_x = round(max(0, min(IMAGE_SIZE, u * IMAGE_SIZE)), 2)
    pixel_y = round(max(0, min(IMAGE_SIZE, (1 - v) * IMAGE_SIZE)), 2)
    return pixel_x, pixel_y


def event_to_bucket(event_name: str) -> str | None:
    if event_name in MOVEMENT_EVENTS:
        return "traffic"
    if event_name in KILL_EVENTS:
        return "kills"
    if event_name in DEATH_EVENTS or event_name in STORM_EVENTS:
        return "deaths"
    return None


def increment_heatmap(target: dict, date_key: str, map_id: str, bucket: str, pixel_x: float, pixel_y: float) -> None:
    cell_x = min(GRID_SIZE - 1, max(0, int(pixel_x / IMAGE_SIZE * GRID_SIZE)))
    cell_y = min(GRID_SIZE - 1, max(0, int(pixel_y / IMAGE_SIZE * GRID_SIZE)))
    index = cell_y * GRID_SIZE + cell_x
    target[date_key][map_id][bucket][index] += 1
    target["all"][map_id][bucket][index] += 1


def blank_heatmaps() -> dict:
    return defaultdict(
        lambda: defaultdict(
            lambda: {bucket: [0 for _ in range(GRID_SIZE * GRID_SIZE)] for bucket in HEATMAP_TYPES}
        )
    )


def read_source_files() -> list[Path]:
    return sorted(
        path
        for path in SOURCE_ROOT.rglob("*")
        if path.is_file()
        and path.name != "README.md"
        and "minimaps" not in path.parts
        and not path.name.startswith(".")
    )


def main() -> None:
    MATCHES_ROOT.mkdir(parents=True, exist_ok=True)
    files = read_source_files()
    matches: dict[str, dict] = {}
    heatmaps = blank_heatmaps()
    stats_by_date_map = defaultdict(lambda: defaultdict(Counter))
    player_type_counts = Counter()
    total_rows = 0

    for file_path in files:
        date_key = iso_date_from_folder(file_path.parent.name)
        table = pq.read_table(file_path)
        frame = table.to_pandas()
        frame["event"] = frame["event"].apply(
            lambda value: value.decode("utf-8") if isinstance(value, bytes) else str(value)
        )

        user_id = str(frame["user_id"].iloc[0])
        match_id = str(frame["match_id"].iloc[0])
        map_id = str(frame["map_id"].iloc[0])
        is_bot = not bool(UUID_RE.match(user_id))
        player_type_counts["bots" if is_bot else "humans"] += 1

        match_entry = matches.setdefault(
            match_id,
            {
                "matchId": match_id,
                "matchFile": f"{match_id.replace('.', '_')}.json",
                "mapId": map_id,
                "date": date_key,
                "players": {},
                "stats": Counter(),
                "minTs": None,
                "maxTs": None,
            },
        )

        player = PlayerRecord(
            user_id=user_id,
            is_bot=is_bot,
            positions=[],
            events=[],
            counts=Counter(),
        )

        for row in frame.itertuples(index=False):
            total_rows += 1
            raw_ts = int(row.ts.value // 1_000_000)
            event_name = row.event
            pixel_x, pixel_y = to_pixel(map_id, float(row.x), float(row.z))
            record = {
                "t": raw_ts,
                "x": round(float(row.x), 2),
                "z": round(float(row.z), 2),
                "px": pixel_x,
                "py": pixel_y,
                "event": event_name,
            }

            player.counts[event_name] += 1
            match_entry["stats"][event_name] += 1
            stats_by_date_map[date_key][map_id][event_name] += 1

            bucket = event_to_bucket(event_name)
            if bucket:
                increment_heatmap(heatmaps, date_key, map_id, bucket, pixel_x, pixel_y)

            if event_name in MOVEMENT_EVENTS:
                player.positions.append(record)
            else:
                player.events.append(record)

            if match_entry["minTs"] is None or raw_ts < match_entry["minTs"]:
                match_entry["minTs"] = raw_ts
            if match_entry["maxTs"] is None or raw_ts > match_entry["maxTs"]:
                match_entry["maxTs"] = raw_ts

        match_entry["players"][user_id] = {
            "userId": player.user_id,
            "isBot": player.is_bot,
            "positions": player.positions,
            "events": player.events,
            "counts": dict(player.counts),
        }

    manifest_matches = []
    overview = {
        "generatedAt": datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": str(SOURCE_ROOT),
        "dates": sorted(stats_by_date_map.keys()),
        "maps": {
            map_id: {
                "image": config["image"],
                "scale": config["scale"],
                "originX": config["origin_x"],
                "originZ": config["origin_z"],
                "imageSize": IMAGE_SIZE,
            }
            for map_id, config in MAP_CONFIG.items()
        },
        "stats": {
            "files": len(files),
            "rows": total_rows,
            "matches": len(matches),
            "playerFiles": dict(player_type_counts),
        },
        "heatmaps": {"gridSize": GRID_SIZE, "values": heatmaps},
        "dateMapStats": stats_by_date_map,
    }

    for match_id, match_entry in sorted(matches.items(), key=lambda item: (item[1]["date"], item[0])):
        min_ts = match_entry["minTs"] or 0
        max_ts = match_entry["maxTs"] or min_ts
        duration_ms = max_ts - min_ts
        humans = 0
        bots = 0
        total_positions = 0
        total_events = 0

        players = []
        for player in match_entry["players"].values():
            if player["isBot"]:
                bots += 1
            else:
                humans += 1
            for item in player["positions"]:
                item["t"] -= min_ts
            for item in player["events"]:
                item["t"] -= min_ts
            player["positions"].sort(key=lambda item: item["t"])
            player["events"].sort(key=lambda item: item["t"])
            total_positions += len(player["positions"])
            total_events += len(player["events"])
            players.append(player)

        players.sort(key=lambda player: (player["isBot"], player["userId"]))

        match_payload = {
            "matchId": match_id,
            "matchFile": match_entry["matchFile"],
            "mapId": match_entry["mapId"],
            "date": match_entry["date"],
            "durationMs": duration_ms,
            "humans": humans,
            "bots": bots,
            "players": players,
            "stats": dict(match_entry["stats"]),
        }

        output_path = MATCHES_ROOT / match_entry["matchFile"]
        output_path.write_text(json.dumps(match_payload, separators=(",", ":")), encoding="utf-8")

        manifest_matches.append(
            {
                "matchId": match_id,
                "matchFile": match_entry["matchFile"],
                "mapId": match_entry["mapId"],
                "date": match_entry["date"],
                "durationMs": duration_ms,
                "humans": humans,
                "bots": bots,
                "positions": total_positions,
                "events": total_events,
                "loot": int(match_entry["stats"]["Loot"]),
                "kills": int(match_entry["stats"]["Kill"] + match_entry["stats"]["BotKill"]),
                "deaths": int(
                    match_entry["stats"]["Killed"]
                    + match_entry["stats"]["BotKilled"]
                    + match_entry["stats"]["KilledByStorm"]
                ),
                "stormDeaths": int(match_entry["stats"]["KilledByStorm"]),
            }
        )

    manifest = {
        "generatedAt": overview["generatedAt"],
        "maps": overview["maps"],
        "dates": overview["dates"],
        "stats": overview["stats"],
        "matches": manifest_matches,
    }

    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    (DATA_ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (DATA_ROOT / "overview.json").write_text(json.dumps(overview), encoding="utf-8")
    print(f"Built {len(manifest_matches)} match files from {len(files)} parquet files.")


if __name__ == "__main__":
    main()
