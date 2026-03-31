import { useRef, useCallback, useEffect } from "react";
import type { Obstacle } from "../engine/types";

type Props = {
  obstacle: Obstacle;
  onDrag: (id: string, x: number, y: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
};

export function ExclusionZone({ obstacle, onDrag, containerRef }: Props) {
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragging.current = true;
      // Store offset from pointer to obstacle top-left
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      offset.current = {
        x: e.clientX - rect.left - obstacle.x,
        y: e.clientY - rect.top - obstacle.y,
      };
    },
    [obstacle.x, obstacle.y, containerRef]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left - offset.current.x;
      const y = e.clientY - rect.top - offset.current.y;
      onDrag(obstacle.id, x, y);
    },
    [obstacle.id, onDrag, containerRef]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  return (
    <div
      className="exclusion-zone"
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        left: obstacle.x,
        top: obstacle.y,
        width: obstacle.width,
        height: obstacle.height,
        touchAction: "none",
      }}
    >
      <img
        src={`https://picsum.photos/seed/${obstacle.id}/${obstacle.width}/${obstacle.height}`}
        alt="Draggable exclusion zone"
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div className="exclusion-handle">Drag me</div>
    </div>
  );
}
