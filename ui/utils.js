/**
 * Check whether a point is within an explicit bounding box.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 */
export function isPointInside(x, y, x0, y0, x1, y1) {
  return (
    x >= x0 &&
    y >= y0 &&
    x <= x1 &&
    y <= y1
  );
}

/**
 * Check whether a point is within a rectangle.
 *
 * @param {number} x
 * @param {number} y
 * @param {Geometry.Rect} rect
 * @return {boolean}
 */
export function isPointInRect(x, y, rect) {
  return (
    x >= rect.x &&
    y >= rect.y &&
    x < rect.x + rect.width &&
    y < rect.y + rect.height
  );
}
