# JTS · Listen & Choose

`jts-listen-and-choose.html` — one self-contained offline file. Open it by double click,
no server, no build step, no npm, no external JS library.

## What is inside

| Section | Purpose |
| --- | --- |
| `I18N`, `LEVEL_HINTS` | every interface string, KZ / RU / EN. Nothing is hardcoded in the markup. |
| `ICONS`, `BACKDROPS`, `renderScene()` | generated artwork used when a real illustration is absent: perspective room, light pool, per-object contact shadow and a light pass masked to the object silhouette. |
| `ASSETS`, `MEDIA` | media resolution: local `assets/` first, optional CDN second, generated scene last. |
| `CONTENT` | one flat array of rounds, the schema below. |
| `AudioEngine` | replay, 0.5/0.75/1/1.25 with `preservesPitch`, seekable progress, `speechSynthesis` fallback. |
| `adapt()`, `stepRate()`, `freshAdaptState()` | pure adaptive-difficulty functions, unit-checked by `runSelfTests()`. |
| `PHASE2` | declared seams for Detail follow-up, Say it back, Streak combo. Off by default. |

`runSelfTests()` runs on every load and prints to the console: adaptive rules,
content integrity (one correct option per round, hotspot radius ≥ 8 %, translations
present) and KZ/RU/EN key parity.

## Selection

The start screen offers a level and nothing else — a session draws from all rounds
of that level. `topic` stays on each round as metadata but never splits the content.

## Round schema

```js
{
  id: "a2_home_012",
  level: "A2",                      // A0 A1 A2 B1 B2 C1
  topic: "home",              // metadata only, the interface no longer splits by topic
  mode: "pinpoint",                 // classic | pinpoint | multipin | elimination
                                    // difference | truefalse | sequence | oddoneout
  accent: "UK",                     // optional: US | UK | AUS (picks the voice)
  audio: "assets/a2/home_012.mp3",
  script: "A small grey cat is sleeping under the kitchen table.",
  chunks: ["A small grey cat...", "...is sleeping under the kitchen table."],  // elimination
  eliminate: [[3], [1]],            // elimination: option indices ruled out by each chunk
  chunkAudio: [...],                // optional per-chunk files
  tfAnswer: true,                   // truefalse
  translations: { ru: "...", kz: "..." },
  options: [
    { img: "assets/a2/home_012_a.webp", scene: {...}, correct: true,
      hotspots: [{ x: 42, y: 68, r: 10, prompt: "Tap the cat" }] },
    { img: null, scene: {...}, correct: false }
  ],
  vocab: ["grey", "under", "kitchen table"]
}
```

Hotspots are percentages of the picture, so they land identically on every width and
under zoom. The engine widens any radius to at least 8 % and to at least a 44 px finger.

`sequence` rounds mark **every** option `correct: true` and are authored in the correct
order; the engine shuffles them for display.

## Why the distractors are generated, not written out

Each round builds its options from one base scene through `V(base, mutate)` — a deep
clone with exactly one field changed. That is what keeps the task a listening task: a
distractor can never differ by anything the audio did not name.

## Adding real media

1. Put files under `assets/<level>/…` next to the html (`.mp3` audio, `.webp` 4:3, ~800×600, ≤120 KB, no text on the picture).
2. List them in `ASSETS.audio` / `ASSETS.image`. Only listed files are ever requested,
   so a shipment without artwork produces no failed network requests at all.
3. Optionally set `MEDIA.cdnBase` for a CDN fallback.

Anything not listed falls back automatically: audio to `speechSynthesis`
(en-US / en-GB / en-AU by `accent`), pictures to the procedural scene.

## Keyboard

`Space` replay · `1`–`6` pick an option · `Enter` next · `S` cycle speed ·
`←` `→` seek on the progress bar · long-press a picture for the large swipeable view.
