import {
  prepareWithSegments,
  layoutNextLine,
  type PreparedTextWithSegments,
  type LayoutCursor,
} from "@chenglou/pretext";
import type {
  Interval,
  PositionedLine,
  Obstacle,
  ColumnRect,
  FullLayoutResult,
} from "./types";

const MIN_SLOT_WIDTH = 40;

/**
 * Carve available horizontal slots from a base interval,
 * subtracting all blocked intervals (obstacles).
 */
function carveSlots(base: Interval, blocked: Interval[]): Interval[] {
  let slots = [base];
  for (const block of blocked) {
    const next: Interval[] = [];
    for (const slot of slots) {
      if (block.right <= slot.left || block.left >= slot.right) {
        next.push(slot);
        continue;
      }
      if (block.left > slot.left)
        next.push({ left: slot.left, right: block.left });
      if (block.right < slot.right)
        next.push({ left: block.right, right: slot.right });
    }
    slots = next;
  }
  return slots.filter((s) => s.right - s.left >= MIN_SLOT_WIDTH);
}

/**
 * Check if a rect obstacle intersects a horizontal band.
 */
function rectBlockedInterval(
  obstacle: Obstacle,
  bandTop: number,
  bandBottom: number,
  columnRect: ColumnRect
): Interval | null {
  // Convert obstacle position (page-relative) to check against band
  const obsTop = obstacle.y;
  const obsBottom = obstacle.y + obstacle.height;
  const obsLeft = obstacle.x;
  const obsRight = obstacle.x + obstacle.width;

  // No vertical intersection
  if (bandBottom <= obsTop || bandTop >= obsBottom) return null;
  // No horizontal intersection with column
  if (obsRight <= columnRect.x || obsLeft >= columnRect.x + columnRect.width)
    return null;

  return { left: obsLeft, right: obsRight };
}

const OBSTACLE_PAD = 8; // px breathing room around images

/**
 * Layout text across multiple columns, flowing around obstacles.
 * Fills ALL available slots per line (both sides of an obstacle).
 */
export function layoutColumns(
  prepared: PreparedTextWithSegments,
  columns: ColumnRect[],
  lineHeight: number,
  obstacles: Obstacle[]
): FullLayoutResult {
  const t0 = performance.now();
  const allColumns: { lines: PositionedLine[]; cursor: LayoutCursor }[] = [];
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let textExhausted = false;

  for (let colIdx = 0; colIdx < columns.length; colIdx++) {
    const col = columns[colIdx]!;
    const lines: PositionedLine[] = [];
    let lineTop = col.y;

    while (lineTop + lineHeight <= col.y + col.height && !textExhausted) {
      const bandTop = lineTop;
      const bandBottom = lineTop + lineHeight;

      // Collect blocked intervals from obstacles (with padding)
      const blocked: Interval[] = [];
      for (const obs of obstacles) {
        const interval = rectBlockedInterval(obs, bandTop, bandBottom, col);
        if (interval) {
          blocked.push({
            left: interval.left - OBSTACLE_PAD,
            right: interval.right + OBSTACLE_PAD,
          });
        }
      }

      // Carve available slots — may be multiple (text on both sides of image)
      const slots = carveSlots(
        { left: col.x, right: col.x + col.width },
        blocked
      );

      if (slots.length === 0) {
        lineTop += lineHeight;
        continue;
      }

      // Fill every slot left-to-right with text from the same cursor
      let filledAny = false;
      for (const slot of slots) {
        if (textExhausted) break;
        const slotWidth = slot.right - slot.left;
        const line = layoutNextLine(prepared, cursor, slotWidth);
        if (line === null) {
          textExhausted = true;
          break;
        }
        lines.push({
          x: slot.left,
          y: lineTop,
          width: line.width,
          text: line.text,
          columnIndex: colIdx,
        });
        cursor = line.end;
        filledAny = true;
      }

      if (!filledAny) {
        lineTop += lineHeight;
        continue;
      }

      lineTop += lineHeight;
    }

    allColumns.push({ lines, cursor });
    if (textExhausted) break;
  }

  // Fill remaining columns with empty results
  while (allColumns.length < columns.length) {
    allColumns.push({ lines: [], cursor });
  }

  const layoutTimeMs = performance.now() - t0;
  const domNodes = allColumns.reduce((sum, c) => sum + c.lines.length, 0);

  return {
    columns: allColumns,
    metrics: {
      layoutTimeMs,
      domNodes,
      reflowCount: 0,
    },
  };
}

/**
 * Prepare text for layout. This measures all segments and caches the results.
 * Call once, then reuse the prepared object for all layout passes.
 */
export function prepareText(
  text: string,
  font: string
): PreparedTextWithSegments {
  return prepareWithSegments(text, font);
}
