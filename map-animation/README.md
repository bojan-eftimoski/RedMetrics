# TideAlert — Map Animation

Self-contained 3D animated map showing a harmful-algal-bloom (HAB) forming
offshore from Genoa, drifting onshore on simulated wind, and tipping the
TideAlert RRI tier from GREEN → CRITICAL. Built for the pitch site as a
drop-in React component.

The map starts on a globe view of Europe, descends through Italy, and settles
on the Ligurian coast while the bloom develops. Real Mapbox satellite imagery
+ 3D terrain + animated wind particles + procedurally-shaded red bloom.

## Tech

- Vite 8 + React 19 + TypeScript (matches `hospital/` and `insurance/`)
- Mapbox GL JS 3.x — globe projection, atmosphere fog, 3D terrain DEM
- Two custom WebGL layers (no extra deps):
  - `WindLayer` — 8000 GPU-rendered particle trails advected through a
    procedural Mediterranean wind field
  - `BloomLayer` — animated red-tide shader (Gaussian core + fbm noise wisps
    scrolled by wind + pulse + coast fade)
- Tailwind v4 — optional severity overlay UI

No external assets ship with the package; the wind field is synthesised
procedurally on first paint, the bloom progression is a JSON timeline.

## Run standalone

```bash
cd map-animation
cp .env.example .env
# Get a free token at https://account.mapbox.com/access-tokens/
echo "VITE_MAPBOX_TOKEN=pk.your_token_here" > .env
npm install
npm run dev
# → http://localhost:5175
```

## Drop into another React app

The component is published as the package main entry, so a developer
integrating it into the larger pitch site can:

### Option A — sibling package (recommended for the monorepo)

In the pitch-site `package.json`:

```jsonc
{
  "dependencies": {
    "tidealert-map-animation": "file:../map-animation"
  }
}
```

Then anywhere in the pitch app:

```tsx
import { TideAlertMap } from 'tidealert-map-animation'

export function MapSection() {
  return (
    <section className="h-screen w-screen">
      <TideAlertMap autoplay loop showControls={false} />
    </section>
  )
}
```

### Option B — copy the folder

The whole `map-animation/src/` tree is dependency-light (`mapbox-gl`, `react`,
`clsx`). Copy `src/` into the pitch app and import `TideAlertMap` directly.

## Props

| Prop            | Type                       | Default                    | Notes                                                        |
| --------------- | -------------------------- | -------------------------- | ------------------------------------------------------------ |
| `mapboxToken`   | `string`                   | `VITE_MAPBOX_TOKEN`        | Public Mapbox token. Required.                               |
| `autoplay`      | `boolean`                  | `true`                     | Start the cinematic on mount.                                |
| `durationMs`    | `number`                   | `30000`                    | Length of one full sequence.                                 |
| `loop`          | `boolean`                  | `true`                     | Restart from frame 0 when the sequence finishes.             |
| `onComplete`    | `() => void`               | —                          | Fires every time a full loop ends.                           |
| `showControls`  | `boolean`                  | `false`                    | Severity badge + timeline + replay button. Hide for pitches. |
| `bloomTimeline` | `BloomTimelineFrame[]`     | 2005 Genoa replay          | Override the bloom progression.                              |
| `styleUrl`      | `string`                   | `satellite-streets-v12`    | Any Mapbox style URL.                                        |
| `className`     | `string`                   | —                          | Tailwind/wrapper className.                                  |

## Pitch-site integration patterns

For a scroll-driven pitch where the map plays after the news-articles section:

```tsx
import { useEffect, useRef, useState } from 'react'
import { TideAlertMap } from 'tidealert-map-animation'

export function PitchPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { threshold: 0.4 },
    )
    if (mapRef.current) obs.observe(mapRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <NewsArticleSection />
      <section ref={mapRef} className="h-screen">
        {inView && <TideAlertMap autoplay loop={false} />}
      </section>
      <NextSection />
    </>
  )
}
```

Mounting the map only when in view avoids paying the GL setup cost on initial
page load, and unmounting (by gating with `inView`) frees GPU memory when the
user scrolls past.

## Swapping in real pipeline data

The default `bloomTimeline` is a hand-tuned 30-second narrative anchored to
the 2005 Genoa _Ostreopsis ovata_ outbreak. To drive it from the live
TideAlert pipeline (`pipeline/run_live_rri.py` writing to Supabase
`rri_scores`), pass a `bloomTimeline` array built from your rows:

```tsx
import { TideAlertMap, type BloomTimelineFrame } from 'tidealert-map-animation'

const frames: BloomTimelineFrame[] = rriRows.map((row, i) => ({
  t: i * 3,                                      // one frame per 3s
  center: [row.center_lon, row.center_lat],
  intensity: row.bloom_probability,
  radiusKm: 8 + row.rri_score * 0.18,
  rri: row.rri_score,
  severity: row.severity,
}))

<TideAlertMap bloomTimeline={frames} durationMs={frames.at(-1)!.t * 1000} />
```

For the wind layer to use real ERA5 data instead of the synthesised field,
swap `src/data/windField.ts::generateWindCanvas()` to load a UV-encoded PNG
into a canvas and read its pixels. The encoding the wind shader expects is
documented at the top of that file (R = u, G = v, B = speed magnitude, all
mapped 0..255 from ±25 m/s).

## Files

```
src/
├── TideAlertMap.tsx          ← the exported component
├── index.ts                  ← package entry
├── types.ts
├── cameraSequence.ts         ← Europe → Genoa flythrough
├── data/
│   ├── bloomTimeline.ts      ← 30s 2005-replay narrative
│   └── windField.ts          ← procedural wind UV canvas
├── layers/
│   ├── WindLayer.ts          ← Mapbox CustomLayer, particle trails
│   └── BloomLayer.ts         ← Mapbox CustomLayer, animated bloom
└── shaders/
    ├── wind.ts               ← GLSL strings
    └── bloom.ts
```

## Performance

- 8000 wind particles → ~5 ms / frame on a 2020 MBP.
- Bloom layer is one screen-aligned quad per frame, ~negligible cost.
- Mapbox terrain at exaggeration 1.4 is the dominant cost; drop to 1.0 for
  weaker hardware.

To tune density, adjust `PARTICLE_COUNT` in `src/layers/WindLayer.ts`.

## Browser support

WebGL2 + ES2023. Targets evergreen Chrome/Firefox/Safari (recent). Mapbox
GL JS handles the WebGL context creation; the custom layers run on the
context Mapbox provides.
