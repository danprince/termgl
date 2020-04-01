import { UI } from "../ui.js";
import { View } from "./view.js";

/**
 * Helper that shows the characters from the current font and logs their
 * charcode to the console when one is clicked. Useful for quickly
 * finding a character to use.
 *
 * @param {object} props
 * @param {UI} [props.ui]
 * @param {number} [props.x]
 * @param {number} [props.y]
 * @return {number} - The currently selected char
 */
export function FontViewer({
  ui = UI.current,
  x = 0,
  y = 0,
}) {
  let { font } = ui.terminal;
  let char;

  ui.pushBoundingBox(x, y, font.columns + 1, font.rows + 1);

  let cursorX = ui.mouse.x - ui.box.x;
  let cursorY = ui.mouse.y - ui.box.y;

  for (let x = 0; x < font.columns; x++) {
    let hex = x.toString(16).toUpperCase();
    let color = cursorX === x ? 0xFFFFFFFF : 0x999999FF;
    ui.put(x, -1, hex[0], color);
  }

  for (let y = 0; y < font.rows; y++) {
    let hex = y.toString(16).toUpperCase();
    let color = cursorY === y ? 0xFFFFFFFF : 0x999999FF;
    ui.put(-1, y, hex[0], color);
  }

  for (let x = 0; x < font.columns; x++) {
    for (let y = 0; y < font.rows; y++) {
      let i = x + y * font.columns;
      let active = cursorX === x && cursorY === y;
      let fg = active ? 0x000000FF : 0xFFFFFFFF;
      let bg = active ? 0xFFFFFFFF : 0x000000FF;
      ui.put(x, y, i, fg, bg);
    }
  }

  if (
    cursorX >= 0 &&
    cursorY >= 0 &&
    cursorX < font.columns &&
    cursorY < font.rows
  ) {
    char = cursorX + cursorY * font.columns;
  }

  if (ui.isMouseOver() && ui.mouse.down) {
    console.info(char);
  }

  ui.popBoundingBox();

  return char;
}
