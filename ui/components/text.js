import { UI } from "../ui.js";
import { Control } from "./control.js";

/**
 * Draw some text within a given rectangle (defaults to the current
 * bounding box).
 *
 * @param {object} props
 * @param {UI} [props.ui]
 * @param {string | number[]} props.value
 * @param {number} [props.x]
 * @param {number} [props.y]
 * @param {number} [props.w]
 * @param {number} [props.h]
 * @param {boolean} [props.wrap]
 * @param {number} [props.fg]
 * @param {number} [props.bg]
 */
export function Text({
  ui = UI.current,
  value,
  x = 0,
  y = 0,
  width = ui.box.width - x,
  height = ui.box.height - y,
  wrap = false,
  style = ui.theme.text
}) {
  if (wrap === false) {
    let cx = x;
    let cy = y;

    for (let i = 0; i < value.length; i++) {
      let char = value[i];

      if (char === "\n") {
        cx = 0;
        cy += 1;
        continue;
      }

      ui.put(cx++, cy, value[i], style.fg, style.bg);
    }
  } else {
    // TODO: Wrap text
  }
}
