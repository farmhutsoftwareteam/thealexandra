import {
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { useLayoutEngine } from "../engine/useLayoutEngine";
import { ExclusionZone } from "./ExclusionZone";
import { PerformanceDashboard } from "./PerformanceDashboard";
import type {
  Obstacle,
  ColumnRect,
  PositionedLine,
  LayoutMetrics,
} from "../engine/types";

const FONT = '18px "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif';
const LINE_HEIGHT = 30;
const COL_GAP = 40;
const PADDING = 48;

const BODY_TEXT = `The web renders text through a pipeline that was designed thirty years ago for static documents. A browser loads a font, shapes the text into glyphs, measures their combined width, determines where lines break, and positions each line vertically. Every step depends on the previous one. Every step requires the rendering engine to consult its internal layout tree — a structure so expensive to maintain that browsers guard access to it behind synchronous reflow barriers that can freeze the main thread for tens of milliseconds at a time.

For a paragraph in a blog post, this pipeline is invisible. The browser loads, lays out, and paints before the reader's eye has traveled from the address bar to the first word. But the web is no longer a collection of static documents. It is a platform for applications, and those applications need to know about text in ways the original pipeline never anticipated.

A messaging application needs to know the exact height of every message bubble before rendering a virtualized list. A masonry layout needs the height of every card to position them without overlap. An editorial page needs text to flow around images, advertisements, and interactive elements. A responsive dashboard needs to resize and reflow text in real time as the user drags a panel divider.

Every one of these operations requires text measurement. And every text measurement on the web today requires a synchronous layout reflow. The cost is devastating. Measuring the height of a single text block forces the browser to recalculate the position of every element on the page. When you measure five hundred text blocks in sequence, you trigger five hundred full layout passes. This pattern, known as layout thrashing, is the single largest source of jank on the modern web.

Chrome DevTools will flag it with angry red bars. Lighthouse will dock your performance score. But the developer has no alternative — CSS provides no API for computing text height without rendering it. The information is locked behind the DOM, and the DOM makes you pay for every answer.

Developers have invented increasingly desperate workarounds. Estimated heights replace real measurements with guesses, causing content to visibly jump when the guess is wrong. ResizeObserver watches elements for size changes, but it fires asynchronously and always at least one frame too late. IntersectionObserver tracks visibility but says nothing about dimensions. Content-visibility allows the browser to skip rendering off-screen elements, but it breaks scroll position and accessibility. Each workaround addresses one symptom while introducing new problems.

The CSS Shapes specification, finalized in 2014, was supposed to bring magazine-style text wrap to the web. It allows text to flow around a defined shape — a circle, an ellipse, a polygon, even an image alpha channel. On paper, it was the answer. In practice, it is remarkably limited. CSS Shapes only works with floated elements. Text can only wrap on one side of the shape. The shape must be defined statically in CSS — you cannot animate it or change it dynamically without triggering a full layout reflow. And because it operates within the browser's layout engine, you have no access to the resulting line geometry. You cannot determine where each line of text starts and ends, how many lines were generated, or what the total height of the shaped text block is.

The editorial layouts we see in print magazines — text flowing around photographs, pull quotes interrupting the column, multiple columns with seamless text handoff — have remained out of reach for the web. Not because they are conceptually difficult, but because the performance cost of implementing them with DOM measurement makes them impractical. A two-column editorial layout that reflows text around three obstacle shapes requires measuring and positioning hundreds of text lines. At thirty milliseconds per measurement, this would take seconds — an eternity for a render frame.

What if text measurement did not require the DOM at all? What if you could compute exactly where every line of text would break, exactly how wide each line would be, and exactly how tall the entire text block would be, using nothing but arithmetic?

This is the core insight of pretext. The browser's canvas API includes a measureText method that returns the width of any string in any font without triggering a layout reflow. Canvas measurement uses the same font engine as DOM rendering — the results are identical. But because it operates outside the layout tree, it carries no reflow penalty.

Pretext exploits this asymmetry. When text first appears, pretext measures every word once via canvas and caches the widths. After this preparation phase, layout is pure arithmetic: walk the cached widths, track the running line width, insert line breaks when the width exceeds the maximum, and sum the line heights. No DOM. No reflow. No layout tree access.

The performance improvement is not incremental. Measuring five hundred text blocks with DOM methods costs fifteen to thirty milliseconds and triggers five hundred layout reflows. With pretext, the same operation costs 0.05 milliseconds and triggers zero reflows. This is a three hundred to six hundred times improvement. But even that number understates the impact, because pretext's cost does not scale with page complexity — it is independent of how many other elements exist on the page.

With DOM-free text measurement, an entire class of previously impractical interfaces becomes trivial. Text can flow around arbitrary shapes, not because the browser's layout engine supports it, but because you control the line widths directly. For each line of text, you compute which horizontal intervals are blocked by obstacles, subtract them from the available width, and pass the remaining width to the layout engine. The engine returns the text that fits, and you position the line at the correct offset.

This is exactly what CSS Shapes tried to accomplish, but with none of its limitations. Obstacles can be any shape — rectangles, circles, arbitrary polygons, even the alpha channel of an image. Text wraps on both sides simultaneously. Obstacles can move, animate, or be dragged by the user, and the text reflows instantly because the layout computation takes less than a millisecond.

Multi-column text flow with cursor handoff is perhaps the most striking capability. The left column consumes text until it reaches the bottom, then hands its cursor to the right column. The right column picks up exactly where the left column stopped, with no duplication, no gap, and perfect line breaking at the column boundary. This is how newspapers and magazines work on paper, but it has never been achievable on the web without extreme hacks.

Pretext makes it trivial. Call layoutNextLine in a loop for the first column, using the column width. When the column is full, take the returned cursor and start a new loop for the second column. The cursor carries the exact position in the prepared text — which segment, which grapheme within that segment. The second column continues seamlessly from the first.

The web has been waiting thirty years for this. A fifteen kilobyte library with zero dependencies delivers it. No browser API changes needed. No specification process. No multi-year standardization timeline. Just math, cached measurements, and the audacity to ask: what if we simply stopped asking the DOM?

Fifteen kilobytes. Zero dependencies. Zero DOM reads. And the text flows.`;

const INITIAL_OBSTACLES: Obstacle[] = [
  { id: "img-1", x: 200, y: 120, width: 200, height: 160 },
  { id: "img-2", x: 100, y: 500, width: 180, height: 140 },
];

export function Alexandria() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [obstacles, setObstacles] = useState<Obstacle[]>(INITIAL_OBSTACLES);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [lines, setLines] = useState<PositionedLine[]>([]);
  const [metrics, setMetrics] = useState<LayoutMetrics>({
    layoutTimeMs: 0,
    domNodes: 0,
    reflowCount: 0,
  });

  const { computeLayout, ready } = useLayoutEngine(BODY_TEXT, FONT);

  // Determine column count based on width
  const columnCount = useMemo(() => {
    if (containerSize.width < 600) return 1;
    if (containerSize.width < 1000) return 2;
    return 3;
  }, [containerSize.width]);

  // Compute column rects
  const columns = useMemo((): ColumnRect[] => {
    const { width } = containerSize;
    if (width === 0) return [];
    const totalGaps = (columnCount - 1) * COL_GAP;
    const colWidth = (width - PADDING * 2 - totalGaps) / columnCount;
    const colHeight = Math.max(600, window.innerHeight - 200);

    return Array.from({ length: columnCount }, (_, i) => ({
      x: PADDING + i * (colWidth + COL_GAP),
      y: 0,
      width: colWidth,
      height: colHeight,
    }));
  }, [containerSize.width, columnCount]);

  // Run layout whenever columns or obstacles change
  useLayoutEffect(() => {
    if (!ready || columns.length === 0) return;

    let rafId: number;
    const runLayout = () => {
      const result = computeLayout(columns, LINE_HEIGHT, obstacles);
      const allLines = result.columns.flatMap((c) => c.lines);
      setLines(allLines);
      setMetrics(result.metrics);
    };

    rafId = requestAnimationFrame(runLayout);
    return () => cancelAnimationFrame(rafId);
  }, [ready, columns, obstacles, computeLayout]);

  // Observe container size
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleObstacleDrag = useCallback(
    (id: string, x: number, y: number) => {
      setObstacles((prev) =>
        prev.map((o) => (o.id === id ? { ...o, x, y } : o))
      );
    },
    []
  );

  // Compute total content height from lines
  const contentHeight = useMemo(() => {
    if (lines.length === 0) return 600;
    return Math.max(...lines.map((l) => l.y + LINE_HEIGHT)) + PADDING;
  }, [lines]);

  return (
    <div className="alexandria">
      <header className="alexandria-header">
        <h1 className="alexandria-title">THE ALEXANDRIA</h1>
        <p className="alexandria-subtitle">Editorial Flow Engine</p>
      </header>

      <div
        className="alexandria-stage"
        ref={containerRef}
        style={{ minHeight: contentHeight }}
      >
        {/* Column guides (visual only) */}
        {columns.map((col, i) => (
          <div
            key={`col-guide-${i}`}
            className="column-guide"
            style={{
              left: col.x,
              top: col.y,
              width: col.width,
              height: col.height,
            }}
          />
        ))}

        {/* Rendered text lines */}
        {lines.map((line, i) => (
          <div
            key={i}
            className="text-line"
            style={{
              position: "absolute",
              left: line.x,
              top: line.y,
              width: line.width,
              height: LINE_HEIGHT,
              lineHeight: `${LINE_HEIGHT}px`,
              font: FONT,
            }}
          >
            {line.text}
          </div>
        ))}

        {/* Draggable exclusion zones */}
        {obstacles.map((obs) => (
          <ExclusionZone
            key={obs.id}
            obstacle={obs}
            onDrag={handleObstacleDrag}
            containerRef={containerRef}
          />
        ))}
      </div>

      <PerformanceDashboard metrics={metrics} />
    </div>
  );
}
