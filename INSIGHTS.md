# Insights

## 1. Ambrose Valley is the economic center of the current game

### What caught my eye

Ambrose Valley dominates both usage and item interaction.

### Evidence

- 566 of 796 reconstructed matches are on Ambrose Valley: `71.1%`
- Ambrose Valley contains `9,955` of `12,885` loot events: `77.3%`
- It also contains `1,799` of `2,418` kill events: `74.4%`

### Actionable takeaway

If the goal is to move overall retention, session value, or combat pacing quickly, Ambrose Valley is the highest-leverage map to tune first.

Likely affected metrics:

- Average loot pickups per session
- Combat encounters per session
- Match completion / extraction likelihood
- Early retention if this is the most common map players see

Suggested actions:

- Prioritize route, loot, and storm-flow iteration here before lower-volume maps
- Use the tool to compare whether future balance patches change Ambrose traffic concentration or loot pickup density

### Why a level designer should care

Most players are experiencing this map. Even a small improvement here affects a much larger share of sessions than a similar change elsewhere.

## 2. Lockdown combat is funneled through a small set of choke lanes around Mine Pit and its connectors

### What caught my eye

Lockdown's fight heatmap is much tighter than its traffic heatmap, especially around the Mine Pit ring road and the approaches toward Engineer's Quarters / Cave House.

### Evidence

- Lockdown has `426` total kills
- Its top 5 kill heatmap cells account for `51` kills: `12.0%` of all kills on the map
- Its top 5 death cells account for `38` deaths: `20.5%` of all deaths on the map
- By comparison, Ambrose Valley's top 5 kill cells account for `9.9%` of map kills, so Lockdown is noticeably more compressed

### Actionable takeaway

Combat is concentrating into a few predictable routes. That is good if the goal is constant pressure, but it can also make engagements feel repetitive and punish players who try to rotate late.

Likely affected metrics:

- Kill participation
- Third-party frequency
- Death clustering
- Perceived fairness of rotations

Suggested actions:

- Add or strengthen one or two flanking alternatives around the Mine Pit lanes
- Break up sightlines with cover on the hottest connectors rather than reducing traffic entirely
- Re-run the kill/death heatmap after changes and look for a flatter top-5 cell share

### Why a level designer should care

This is exactly the kind of map where a small cover or route change can noticeably reshape combat cadence.

## 3. Storm pressure is disproportionately punishing on Grand Rift and Lockdown

### What caught my eye

Storm deaths are rare overall, but they are meaningfully more common on the smaller maps than on Ambrose Valley.

### Evidence

- Total storm deaths in the sample: `39`
- Lockdown has `17` storm deaths and Grand Rift has `5`
- Storm deaths as a share of all deaths:
  - Ambrose Valley: `3.4%`
  - Lockdown: `9.2%`
  - Grand Rift: `9.6%`

### Actionable takeaway

The issue may not be raw combat balance. It may be route readability, storm telegraphing, or extraction path friction on the smaller maps.

Likely affected metrics:

- Deaths to environment
- Extraction success rate
- Frustration after long loot runs
- Late-rotation abandonment

Suggested actions:

- Check whether storm-safe paths are visually obvious on Lockdown and Grand Rift
- Audit whether late-game exits or crossing points are too exposed
- Use the playback mode to inspect a few storm-death matches and see if players are trapped by route geometry or simply rotating too late

### Why a level designer should care

Storm deaths often feel less fair than combat deaths. If the environment is generating avoidable losses, map readability and pathing may need attention.
