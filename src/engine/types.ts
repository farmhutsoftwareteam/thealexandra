import type { LayoutCursor } from "@chenglou/pretext";

export type Interval = {
  left: number;
  right: number;
};

export type PositionedLine = {
  x: number;
  y: number;
  width: number;
  text: string;
  columnIndex: number;
};

export type Obstacle = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ColumnRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayoutMetrics = {
  layoutTimeMs: number;
  domNodes: number;
  reflowCount: number;
};

export type ColumnLayoutResult = {
  lines: PositionedLine[];
  cursor: LayoutCursor;
};

export type FullLayoutResult = {
  columns: ColumnLayoutResult[];
  metrics: LayoutMetrics;
};
