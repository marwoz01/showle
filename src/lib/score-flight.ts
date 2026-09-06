type Rect = { left: number; top: number; width: number; height: number };

/** Coordinates in the game overlay, with a center-to-center flight to the total. */
export function scoreFlight(frame: Rect, layer: Rect, counter: Rect) {
  const centerX = frame.left + frame.width / 2;
  const centerY = frame.top + frame.height / 2;
  return {
    left: centerX - layer.left,
    top: centerY - layer.top,
    x: counter.left + counter.width / 2 - centerX,
    y: counter.top + counter.height / 2 - centerY,
  };
}
