# The Alexandria

A browser-based editorial flow engine that typesets multiline text across multiple columns, wrapping dynamically around animated obstacles — all at 60fps with zero DOM reflows.

## Why We Built This

Traditional web text layout is stuck in a 30-year-old pipeline. Every time you need to know how tall a paragraph is, or where a line breaks, you have to ask the browser — and the browser forces a synchronous layout reflow that can freeze the main thread for tens of milliseconds.

The Alexandria proves there's another way. By measuring text through the Canvas API instead of the DOM, we can compute line breaks, text height, and multi-column flow using pure arithmetic. Text wraps around animated circular obstacles in real-time. Columns hand off cursors seamlessly. And the entire layout computation takes under a millisecond per frame.

The project includes an interactive CV demo where floating project orbs drift across the page while narrative text reflows around them instantly — something CSS alone cannot do.

## Credits

This project is built on top of **[pretext](https://github.com/chenglou/pretext)** by **[Cheng Lou](https://chenglou.me)** (`@chenglou`). Pretext is a 15KB, zero-dependency text measurement and layout library that makes DOM-free typesetting possible. The editorial engine demo in the pretext repository was the direct inspiration and reference implementation for this project.

- **pretext** — [github.com/chenglou/pretext](https://github.com/chenglou/pretext)
- **Live demos** — [chenglou.me/pretext](https://chenglou.me/pretext/)
- **npm** — [@chenglou/pretext](https://www.npmjs.com/package/@chenglou/pretext)

Without Cheng Lou's work on pretext, this project would not exist. All credit for the core text measurement engine, the `layoutNextLine` cursor-based API, the slot-carving algorithm for obstacle avoidance, and the DOM-pooling render pattern goes to him.

## Features

- **Multi-column text flow** — Text spills from column 1 to column 2 to column 3 using cursor handoff
- **Obstacle avoidance** — Text wraps around circular and rectangular obstacles on both sides simultaneously
- **Animated orbs** — Floating spheres with physics (velocity, wall bouncing, collision) that text reflows around every frame
- **Drop caps** — Large first letter as a rect obstacle that text flows around
- **Pull quotes** — Styled callout boxes positioned as obstacles within columns
- **Adaptive headline sizing** — Binary search for the largest font size that fits without breaking words
- **Zero DOM reflows** — All text measurement via Canvas API, all positioning via direct style writes
- **Performance dashboard** — Live overlay showing layout time, line count, and reflow count (always 0)
- **Interactive** — Drag orbs to reposition them, click to pause/unpause, click labels to visit links
- **Responsive** — Columns collapse from 3 to 2 to 1 based on viewport width

## Tech Stack

- **[pretext](https://github.com/chenglou/pretext)** — Text measurement and line-breaking engine
- **React** — UI shell and view switching
- **Vite** — Build tooling
- **TypeScript** — Type safety
- **Framer Motion** — Available for the engine demo drag interactions

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see the CV demo. Use the tabs at the top to switch between the CV and the engine demo.

## How It Works

1. **Prepare** — `prepareWithSegments(text, font)` measures every word via Canvas and caches the widths
2. **Layout** — For each line, compute blocked intervals from obstacles, carve available slots, call `layoutNextLine(prepared, cursor, slotWidth)` for each slot
3. **Render** — Write `left`, `top`, and `textContent` to pooled DOM elements — the absolute minimum DOM writes
4. **Repeat** — On every `requestAnimationFrame`, update obstacle positions, re-run layout (< 1ms), update DOM

The cursor returned by `layoutNextLine` carries the exact position in the text (segment index + grapheme index), enabling seamless handoff between columns and slots.

## License

MIT
