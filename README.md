# Solmar City

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/chaimibvm-a11y/makefun-gta6-game/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/chaimibvm-a11y/makefun-gta6-game/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in the spirit of GTA 6, built by an AI agent for make.fun's “Make GTA 6” bounty, $1,666 in USDC.

Dario Venn is back in Solmar City — a sun-soaked coastal city of palm-lined avenues, a beachfront drive, a casino, a marina and a downtown that never sleeps. Walk the sidewalks or steal any car on the street, outrun the SCPD when the wanted stars climb, and run six story missions for Mara Kessler, the fixer who runs a garage on Palm Row, while Kane Mercer's crew tries to take it all from her.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network requests: every file the game loads lives under `game/`.

## Play

- **WASD / arrows** — walk and drive
- **Shift** — run (on foot) / handbrake (in a car)
- **E** — steal / enter a car, get out
- **F** — punch
- **Mouse** — aim, **click** — shoot the pistol
- **P** — pause, **J** — missions, **M** — mute, **Q** — save

Steal a car, hit a pedestrian or open fire and the wanted level rises; lay low and out of sight and it cools off. At three stars the SCPD sends officers on foot. Get busted or wasted and you wake up at Precinct 7 or Solmar General, lighter by a fine. Missions pay cash — finish all six to become a Solmar legend.

## What is in the game

- **A city to explore** — a road grid of avenues and streets, buildings with lit windows, parks with a plaza fountain, the Docks, the Marina and a beach with animated waves.
- **Traffic and pedestrians** — cars that drive the road grid and stop for nothing, pedestrians who stroll the sidewalks and run from gunfire and fast cars.
- **Cars to steal and drive** — six types (sedan, taxi, sports car, truck, van, police interceptor) with their own speed, grip and health; damage smokes, wrecks stop.
- **A wanted level** — five stars, police cars that chase and ram, officers on foot at three stars, busted and wasted screens with fines and respawns.
- **Six story missions** — a getaway, a package run, losing the heat, a repo job, a garage siege and the Casino Solmar vault, with objectives on the HUD and the minimap.
- **Combat** — fists and a pistol with ammo, rival crew members who shoot back.
- **A HUD with a minimap** — health, money, ammo, wanted stars, the game clock and a live map of the city, the police and the mission marker.
- **Sound** — a Web Audio engine hum, two-tone sirens, gunshots, crashes and a bass-and-hats music loop, all generated in the browser. Nothing is downloaded.
- **Save** — progress, money and missions live in localStorage; the game autosaves and the pause menu saves on demand.

## The code

The game is plain ES modules under `game/src/`, one file per job: `city.js` builds Solmar City, `cars.js` drives the traffic and the police, `people.js` walks the pedestrians and the officers, `combat.js` fires the guns, `wanted.js` runs the heat, `missions.js` tells the story, `audio.js` makes the sound, `hud.js` draws the HUD and the minimap, `render.js` paints the world, and `world.js` steps it all forward sixty times a second. `main.ts` copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=haayh57w&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
