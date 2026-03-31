import { useState, useCallback, useRef, useEffect } from "react";
import type { PreparedTextWithSegments } from "@chenglou/pretext";
import { prepareText, layoutColumns } from "./layout";
import type {
  Obstacle,
  ColumnRect,
  FullLayoutResult,
  PositionedLine,
  LayoutMetrics,
} from "./types";

const EMPTY_RESULT: FullLayoutResult = {
  columns: [],
  metrics: { layoutTimeMs: 0, domNodes: 0, reflowCount: 0 },
};

export function useLayoutEngine(text: string, font: string) {
  const preparedRef = useRef<PreparedTextWithSegments | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    document.fonts.ready.then(() => {
      preparedRef.current = prepareText(text, font);
      setReady(true);
    });
  }, [text, font]);

  const computeLayout = useCallback(
    (
      columns: ColumnRect[],
      lineHeight: number,
      obstacles: Obstacle[]
    ): FullLayoutResult => {
      if (!preparedRef.current || columns.length === 0) return EMPTY_RESULT;
      return layoutColumns(preparedRef.current, columns, lineHeight, obstacles);
    },
    []
  );

  return { computeLayout, ready };
}

export type { PositionedLine, LayoutMetrics, Obstacle, ColumnRect };
