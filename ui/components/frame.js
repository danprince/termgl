import { UI } from "../ui.js";

/**
 * @param {object} props
 * @param {UI} [props.ui]
 * @param {number} [props.x]
 * @param {number} [props.y]
 * @param {number} [props.width]
 * @param {number} [props.height]
 * @param {number} [props.fg]
 * @param {number} [props.bg]
 * @param {string | number[]} [props.chars]
 * @param {() => any} [callback]
 */
export function Frame({
  ui = UI.current,
  x = 0,
  y = 0,
  width = ui.box.width,
  height = ui.box.height,
  chars = "┌─┐│┘─└│",
  fg = 0xFFFFFFFF,
  bg = 0x00000000,
}, callback) {
  let x0 = x;
  let y0 = y;
  let x1 = x + width - 1;
  let y1 = y + height - 1;

  for (let i = 1; i < width - 1; i++) {
    ui.put(x0 + i, y0, chars[1], fg, bg);
    ui.put(x0 + i, y1, chars[5], fg, bg);
  }

  for (let j = 1; j < height; j++) {
    ui.put(x0, y0 + j, chars[3], fg, bg);
    ui.put(x1, y0 + j, chars[7], fg, bg);
  }

  ui.put(x0, y0, chars[0], fg, bg);
  ui.put(x1, y0, chars[2], fg, bg);
  ui.put(x1, y1, chars[4], fg, bg);
  ui.put(x0, y1, chars[6], fg, bg);

  if (callback) {
    ui.pushBoundingBox(x + 1, y + 1, width - 2, height - 2);
    callback();
    ui.popBoundingBox();
  }
}
