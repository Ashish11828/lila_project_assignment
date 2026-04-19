const state = {
  manifest: null,
  overview: null,
  currentMatch: null,
  animationFrame: null,
  isPlaying: false,
};

const ui = {
  mapSelect: document.querySelector("#mapSelect"),
  dateSelect: document.querySelector("#dateSelect"),
  matchSelect: document.querySelector("#matchSelect"),
  playButton: document.querySelector("#playButton"),
  resetButton: document.querySelector("#resetButton"),
  timeline: document.querySelector("#timeline"),
  timelineCurrent: document.querySelector("#timelineCurrent"),
  timelineMax: document.querySelector("#timelineMax"),
  mapImage: document.querySelector("#mapImage"),
  mapTitle: document.querySelector("#mapTitle"),
  legend: document.querySelector("#legend"),
  notes: document.querySelector("#notes"),
  stats: document.querySelector("#stats"),
  heatmapCanvas: document.querySelector("#heatmapCanvas"),
  overlayCanvas: document.querySelector("#overlayCanvas"),
  toggles: {
    showHumans: document.querySelector("#showHumans"),
    showBots: document.querySelector("#showBots"),
    showLoot: document.querySelector("#showLoot"),
    showKills: document.querySelector("#showKills"),
    showDeaths: document.querySelector("#showDeaths"),
    showStorm: document.querySelector("#showStorm"),
    showPaths: document.querySelector("#showPaths"),
    showHeatmap: document.querySelector("#showHeatmap"),
    heatmapType: document.querySelector("#heatmapType"),
  },
};

const overlayCtx = ui.overlayCanvas.getContext("2d");
const heatmapCtx = ui.heatmapCanvas.getContext("2d");
const colors = {
  humans: "#59e1ff",
  bots: "#f6b35e",
  loot: "#ffd76e",
  kills: "#ff5f6d",
  deaths: "#ffffff",
  storm: "#a78bfa",
};

function formatMs(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function matchFilters() {
  return {
    mapId: ui.mapSelect.value,
    date: ui.dateSelect.value,
  };
}

function filteredMatches() {
  const { mapId, date } = matchFilters();
  return state.manifest.matches.filter((match) => {
    if (mapId !== "all" && match.mapId !== mapId) return false;
    if (date !== "all" && match.date !== date) return false;
    return true;
  });
}

function updateSelect(select, options, selectedValue) {
  select.innerHTML = "";
  for (const option of options) {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    if (option.value === selectedValue) node.selected = true;
    select.appendChild(node);
  }
}

function getDateMapStats(date, mapId) {
  const dateKey = date === "all" ? "all" : date;
  if (dateKey === "all") {
    return state.manifest.matches
      .filter((match) => mapId === "all" || match.mapId === mapId)
      .reduce(
        (acc, match) => {
          acc.matches += 1;
          acc.humans += match.humans;
          acc.bots += match.bots;
          acc.loot += match.loot;
          acc.kills += match.kills;
          acc.deaths += match.deaths;
          return acc;
        },
        { matches: 0, humans: 0, bots: 0, loot: 0, kills: 0, deaths: 0 },
      );
  }

  const mapStats = state.overview.dateMapStats?.[dateKey]?.[mapId];
  if (!mapStats) {
    return { matches: filteredMatches().length, humans: 0, bots: 0, loot: 0, kills: 0, deaths: 0 };
  }

  return {
    matches: filteredMatches().length,
    humans: 0,
    bots: 0,
    loot: mapStats.Loot || 0,
    kills: (mapStats.Kill || 0) + (mapStats.BotKill || 0),
    deaths: (mapStats.Killed || 0) + (mapStats.BotKilled || 0) + (mapStats.KilledByStorm || 0),
  };
}

function renderStats() {
  const matches = filteredMatches();
  const aggregate = matches.reduce(
    (acc, match) => {
      acc.matches += 1;
      acc.humans += match.humans;
      acc.bots += match.bots;
      acc.loot += match.loot;
      acc.kills += match.kills;
      acc.deaths += match.deaths;
      return acc;
    },
    { matches: 0, humans: 0, bots: 0, loot: 0, kills: 0, deaths: 0 },
  );

  ui.stats.innerHTML = "";
  const cards = [
    ["Matches", aggregate.matches],
    ["Human files", aggregate.humans],
    ["Bot files", aggregate.bots],
    ["Loot", aggregate.loot],
    ["Kills", aggregate.kills],
    ["Deaths", aggregate.deaths],
  ];

  for (const [label, value] of cards) {
    const card = document.createElement("div");
    card.className = "stat-card";
    card.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    ui.stats.appendChild(card);
  }
}

function renderLegend() {
  const items = [
    ["Humans", colors.humans],
    ["Bots", colors.bots],
    ["Loot", colors.loot],
    ["Kills", colors.kills],
    ["Deaths", colors.deaths],
    ["Storm", colors.storm],
  ];
  ui.legend.innerHTML = items
    .map(
      ([label, color]) =>
        `<div class="legend-item"><span class="legend-swatch" style="background:${color}"></span>${label}</div>`,
    )
    .join("");
}

function drawMarker(ctx, event, color) {
  const { px, py } = event;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  if (event.event === "Loot") {
    ctx.translate(px, py);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
  } else if (event.event === "KilledByStorm") {
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px, py - 7);
    ctx.lineTo(px, py + 7);
    ctx.moveTo(px - 7, py);
    ctx.lineTo(px + 7, py);
    ctx.stroke();
  } else if (event.event === "Kill" || event.event === "BotKill") {
    ctx.beginPath();
    ctx.moveTo(px - 6, py - 6);
    ctx.lineTo(px + 6, py + 6);
    ctx.moveTo(px + 6, py - 6);
    ctx.lineTo(px - 6, py + 6);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function playerVisible(player) {
  if (player.isBot && !ui.toggles.showBots.checked) return false;
  if (!player.isBot && !ui.toggles.showHumans.checked) return false;
  return true;
}

function renderOverlay() {
  overlayCtx.clearRect(0, 0, 1024, 1024);
  const match = state.currentMatch;
  if (!match) return;

  const currentTime = Number(ui.timeline.value);

  for (const player of match.players) {
    if (!playerVisible(player)) continue;
    const color = player.isBot ? colors.bots : colors.humans;
    const visiblePositions = player.positions.filter((point) => point.t <= currentTime);

    if (ui.toggles.showPaths.checked && visiblePositions.length > 1) {
      overlayCtx.save();
      overlayCtx.strokeStyle = color;
      overlayCtx.lineWidth = player.isBot ? 1.3 : 2.2;
      overlayCtx.globalAlpha = player.isBot ? 0.42 : 0.8;
      overlayCtx.beginPath();
      visiblePositions.forEach((point, index) => {
        if (index === 0) overlayCtx.moveTo(point.px, point.py);
        else overlayCtx.lineTo(point.px, point.py);
      });
      overlayCtx.stroke();
      overlayCtx.restore();
    }

    const head = visiblePositions.at(-1);
    if (head) {
      overlayCtx.save();
      overlayCtx.fillStyle = color;
      overlayCtx.beginPath();
      overlayCtx.arc(head.px, head.py, player.isBot ? 3 : 5, 0, Math.PI * 2);
      overlayCtx.fill();
      overlayCtx.restore();
    }

    for (const event of player.events) {
      if (event.t > currentTime) continue;
      if (event.event === "Loot" && !ui.toggles.showLoot.checked) continue;
      if ((event.event === "Kill" || event.event === "BotKill") && !ui.toggles.showKills.checked) continue;
      if ((event.event === "Killed" || event.event === "BotKilled") && !ui.toggles.showDeaths.checked) continue;
      if (event.event === "KilledByStorm" && !ui.toggles.showStorm.checked) continue;

      const color =
        event.event === "Loot"
          ? colors.loot
          : event.event === "KilledByStorm"
            ? colors.storm
            : event.event === "Kill" || event.event === "BotKill"
              ? colors.kills
              : colors.deaths;
      drawMarker(overlayCtx, event, color);
    }
  }
}

function heatmapValues() {
  if (!ui.toggles.showHeatmap.checked) return null;
  const heatmapType = ui.toggles.heatmapType.value;

  if (state.currentMatch) {
    const gridSize = state.overview.heatmaps.gridSize;
    const values = new Array(gridSize * gridSize).fill(0);
    for (const player of state.currentMatch.players) {
      if (!playerVisible(player)) continue;
      const source = heatmapType === "traffic" ? player.positions : player.events;
      for (const item of source) {
        const isAllowed =
          heatmapType === "traffic"
            ? true
            : heatmapType === "kills"
              ? item.event === "Kill" || item.event === "BotKill"
              : item.event === "Killed" || item.event === "BotKilled" || item.event === "KilledByStorm";
        if (!isAllowed) continue;
        const cellX = Math.min(gridSize - 1, Math.max(0, Math.floor((item.px / 1024) * gridSize)));
        const cellY = Math.min(gridSize - 1, Math.max(0, Math.floor((item.py / 1024) * gridSize)));
        values[cellY * gridSize + cellX] += 1;
      }
    }
    return { gridSize, values };
  }

  const mapId = ui.mapSelect.value;
  if (mapId === "all") return null;
  const date = ui.dateSelect.value;
  const dateKey = date === "all" ? "all" : date;
  const values = state.overview.heatmaps.values?.[dateKey]?.[mapId]?.[heatmapType];
  if (!values) return null;
  return { gridSize: state.overview.heatmaps.gridSize, values };
}

function renderHeatmap() {
  heatmapCtx.clearRect(0, 0, 1024, 1024);
  const data = heatmapValues();
  if (!data) return;

  const maxValue = Math.max(...data.values, 0);
  if (!maxValue) return;

  const cellSize = 1024 / data.gridSize;
  for (let index = 0; index < data.values.length; index += 1) {
    const value = data.values[index];
    if (!value) continue;
    const x = (index % data.gridSize) * cellSize;
    const y = Math.floor(index / data.gridSize) * cellSize;
    const intensity = value / maxValue;
    const hue = ui.toggles.heatmapType.value === "traffic" ? 185 : ui.toggles.heatmapType.value === "kills" ? 350 : 42;
    heatmapCtx.fillStyle = `hsla(${hue}, 100%, ${60 - intensity * 18}%, ${0.08 + intensity * 0.46})`;
    heatmapCtx.fillRect(x, y, cellSize, cellSize);
  }
}

function refreshNotes() {
  const match = state.currentMatch;
  if (match) {
    ui.mapTitle.textContent = `${match.mapId} • ${match.matchId.slice(0, 8)}…`;
    ui.notes.textContent = `Showing ${match.humans} human file(s) and ${match.bots} bot file(s). Playback runs for ${formatMs(match.durationMs)}.`;
  } else {
    const matches = filteredMatches();
    ui.mapTitle.textContent = ui.mapSelect.value === "all" ? "Choose a map or match" : ui.mapSelect.value;
    ui.notes.textContent =
      matches.length > 0
        ? `${matches.length} match file group(s) match the current filters. Select a match for timeline playback, or use the heatmap to inspect aggregate patterns.`
        : "No matches fit the current filters.";
  }
}

async function loadMatch(matchId) {
  const summary = state.manifest.matches.find((entry) => entry.matchId === matchId);
  if (!summary) {
    state.currentMatch = null;
    render();
    return;
  }
  const response = await fetch(`./data/matches/${summary.matchFile}`);
  state.currentMatch = await response.json();
  ui.timeline.max = String(state.currentMatch.durationMs || 1);
  ui.timeline.value = "0";
  ui.timelineMax.textContent = formatMs(state.currentMatch.durationMs);
  ui.timelineCurrent.textContent = "00:00";
  updateMapImage(state.currentMatch.mapId);
  render();
}

function updateMapImage(mapId) {
  const map = state.manifest.maps[mapId];
  if (map) ui.mapImage.src = `./minimaps/${map.image}`;
}

function syncMatchSelect(preferredMatchId) {
  const options = [{ value: "", label: "Aggregate view" }].concat(
    filteredMatches().map((match) => ({
      value: match.matchId,
      label: `${match.date} • ${match.matchId.slice(0, 8)}… • H${match.humans}/B${match.bots}`,
    })),
  );
  const fallback =
    preferredMatchId && options.some((item) => item.value === preferredMatchId) ? preferredMatchId : options[0].value;
  updateSelect(ui.matchSelect, options, fallback);
}

function populateFilters() {
  updateSelect(
    ui.mapSelect,
    [{ value: "all", label: "All maps" }].concat(
      Object.keys(state.manifest.maps).map((mapId) => ({ value: mapId, label: mapId })),
    ),
    "AmbroseValley",
  );

  updateSelect(
    ui.dateSelect,
    [{ value: "all", label: "All dates" }].concat(
      state.manifest.dates.map((date) => ({ value: date, label: date })),
    ),
    "all",
  );

  syncMatchSelect("");
  updateMapImage("AmbroseValley");
}

function stopPlayback() {
  state.isPlaying = false;
  if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
  state.animationFrame = null;
  ui.playButton.textContent = "Play";
}

function tickPlayback(previousTime) {
  if (!state.isPlaying || !state.currentMatch) return;
  const start = performance.now();
  const loop = (now) => {
    if (!state.isPlaying || !state.currentMatch) return;
    const delta = now - start + (previousTime || 0);
    const nextValue = Math.min(state.currentMatch.durationMs, Math.floor(delta * 8));
    ui.timeline.value = String(nextValue);
    ui.timelineCurrent.textContent = formatMs(nextValue);
    renderOverlay();
    if (nextValue >= state.currentMatch.durationMs) {
      stopPlayback();
      return;
    }
    state.animationFrame = requestAnimationFrame(loop);
  };
  state.animationFrame = requestAnimationFrame(loop);
}

function render() {
  ui.timelineCurrent.textContent = formatMs(Number(ui.timeline.value));
  renderStats();
  renderHeatmap();
  renderOverlay();
  renderLegend();
  refreshNotes();
}

function bindEvents() {
  ui.mapSelect.addEventListener("change", async () => {
    stopPlayback();
    syncMatchSelect("");
    const mapId = ui.mapSelect.value;
    if (mapId !== "all") updateMapImage(mapId);
    state.currentMatch = null;
    render();
  });

  ui.dateSelect.addEventListener("change", () => {
    stopPlayback();
    syncMatchSelect("");
    state.currentMatch = null;
    render();
  });

  ui.matchSelect.addEventListener("change", async () => {
    stopPlayback();
    if (!ui.matchSelect.value) {
      state.currentMatch = null;
      render();
      return;
    }
    await loadMatch(ui.matchSelect.value);
  });

  ui.timeline.addEventListener("input", () => {
    stopPlayback();
    renderOverlay();
    ui.timelineCurrent.textContent = formatMs(Number(ui.timeline.value));
  });

  ui.playButton.addEventListener("click", () => {
    if (!state.currentMatch) return;
    if (state.isPlaying) {
      stopPlayback();
      return;
    }
    state.isPlaying = true;
    ui.playButton.textContent = "Pause";
    tickPlayback(Number(ui.timeline.value));
  });

  ui.resetButton.addEventListener("click", () => {
    stopPlayback();
    ui.timeline.value = "0";
    render();
  });

  Object.values(ui.toggles).forEach((element) => {
    element.addEventListener("change", () => render());
  });
}

async function init() {
  const [manifestResponse, overviewResponse] = await Promise.all([
    fetch("./data/manifest.json"),
    fetch("./data/overview.json"),
  ]);
  state.manifest = await manifestResponse.json();
  state.overview = await overviewResponse.json();
  populateFilters();
  bindEvents();
  render();
}

init();
