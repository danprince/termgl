import { UI } from "../ui.js";
import { Control } from "./control.js";
import { Text } from "./text.js";

/**
 * @param {object} props
 * @param {UI} [props.ui]
 * @param {string} props.label
 * @param {any} props.id
 * @param {number} [props.x]
 * @param {number} [props.y]
 * @param {number} [props.width]
 * @param {number} [props.height]
 * @param {boolean} [props.disabled]
 */
export function Button({
  ui = UI.current,
  label,
  id,
  x = 0,
  y = 0,
  width = label.length,
  height = 1,
  disabled = false,
  style = ui.theme.button.default,
  focusStyle = ui.theme.button.focus,
  hoverStyle = ui.theme.button.hover,
  activeStyle = ui.theme.button.active,
  disabledStyle = ui.theme.button.disabled,
}) {
  let clicked = false;

  Control({ id, x, y, width, height, disabled }, () => {
    let styles = Object.assign(
      {},
      style,
      ui.isHovered() && hoverStyle,
      ui.isFocused() && focusStyle,
      ui.isActive() && activeStyle,
      disabled && disabledStyle,
    );

    clicked = ui.isActive();

    if (label) {
      Text({ value: label, style: styles });
    }
  });

  return clicked;
}
