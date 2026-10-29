# Ghost Janitor: 8-Bit Arcade (PWA) - 14 floors

## Run it
PWAs need to be served over http(s) (not opened as file://). From this folder:

    python3 -m http.server 8080
    # then open http://localhost:8080

Deploy anywhere static (GitHub Pages, Netlify, Cloudflare Pages, Vercel). Keep this folder structure
(index.html, sw.js, manifest files in the root; PNG/SVG icons in /icons).

## Updating an existing install
sw.js cache name was bumped to `ghost-janitor-cache-v4`, so installed copies refresh automatically on the
next online launch (close and reopen the app once if you still see the old floors).

## New floors (9-14)
| Floor | Theme | New mechanic |
|-------|-------|--------------|
| 9  | Frozen Ice Rink        | Ice tiles: you build momentum and slide |
| 10 | Toy Factory            | Conveyor belts drag you along (all 4 directions) |
| 11 | Museum Laser Heist     | 130s time attack. Pulsing laser tripwires: a zap adds +35 panic and rings an alarm that lures guards |
| 12 | Mirror Maze Funhouse   | Pillar maze + 4 pairs of colour-coded warp portals |
| 13 | Haunted Catacombs      | Darkness. Possess a candle for a huge light radius; guards carry flashlights |
| 14 | Dust King's Palace     | Finale: ice + belts + lasers + portals + darkness, 5 guards, 170s |

Cleared floors get a check mark in the lobby (stored in localStorage as `gj_cleared`).

## Adding your own floors
Floors 9-14 are plain config objects in `BONUS_LEVEL_CONFIGS` (index.html). Each is a 3x3 room layout with:
`hazards` (ice / belts_h / belts_v / lasers / scatter / fill), `pillars`, `pillarStep`, `portals`, `darkness`,
`tools`, `dust` palette and `npcs`. Copy one, change the id, and it shows up in the lobby automatically.
