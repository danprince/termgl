import { UI } from "../ui.js";

/**
 * TODO: padding
 * TODO: align
 * TODO: justify
 * TODO: position: absolute
 *
 * @param {object} props
 * @param {UI} [props.ui]
 * @param {number} [props.x] Relative X coordinate of the view
 * @param {number} [props.y] Relative Y coordinate of the view
 * @param {number} [props.width] Width of the view (in cells)
 * @param {number} [props.height] Height of the view (in cells)
 * @param {() => any} callback
 */
export function View({
  ui = UI.current,
  x = 0,
  y = 0,
  width = ui.box.width - x,
  height = ui.box.height - y,
}, callback) {
  ui.pushBoundingBox(x, y, width, height);
  callback();
  ui.popBoundingBox();
}
