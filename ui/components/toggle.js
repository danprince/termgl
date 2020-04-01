import { UI } from "../ui.js";
import { Control } from "./control.js";
import { Text } from "./text.js";

/**
 *
 */
export function Toggle({
  ui = UI.current,
  id,
  value,
  x = 0,
  y = 0,
  width = 1,
  height = 1,
  disabled = false,
}, callback) {
  Control({ id, x, y, width, height, disabled }, () => {
    if (ui.isActive()) {
      value = !value;
    }

    callback(value);
  });

  return value;
}
