import { UI } from "../ui.js";
import { Control } from "./control.js";

const INVALID_KEYS_REGEX = /^[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]$/;

let cursor = 0;

function setCursor(value, cursor) {
  cursor = Math.max(0, cursor);
  cursor = Math.min(value.length, cursor);
  return cursor;
}

function deleteAt(value, cursor) {
  if (cursor > 0) {
    return value.slice(0, cursor - 1) + value.slice(cursor);
  } else {
    return value;
  }
}

function insertAt(value, cursor, char) {
  return value.slice(0, cursor) + char + value.slice(cursor);
}

/**
 * TODO: Selections
 * TODO: Scrolling
 * TODO: Non-global cursors
 */
export function Input({
  ui = UI.current,
  id,
  value,
  placeholder = "",
  x = 0,
  y = 0,
  width = Math.max(value.length, placeholder.length) + 1,
  height = 1,
  disabled = false,
  style = ui.theme.input.default,
  focusStyle = ui.theme.input.focus,
  hoverStyle = ui.theme.input.hover,
  placeholderStyle = ui.theme.inputPlaceholder,
  caretStyle = ui.theme.inputCaret,
}) {
  Control({ id, x, y, width, height, disabled }, () => {
    if (
      ui.isFocused() &&
      ui.event instanceof KeyboardEvent &&
      ui.event.type === "keydown"
    ) {
      let code = ui.event.which;

      cursor = setCursor(value, cursor);

      let isValidKey = (
        (code > 31) &&
        (code < 37 || code > 40) &&
        (code !== 91) && // meta key
        (code !== 127)
      );

      if (ui.event.metaKey || ui.event.controlKey) {
        // Ignore the event if it uses a meta key
      }

      else if (ui.event.key === "ArrowLeft") {
        cursor = setCursor(value, cursor - 1);
        ui.event.preventDefault();
        ui.stopEventPropagation();
      }

      else if (ui.event.key === "ArrowRight") {
        cursor = setCursor(value, cursor + 1);
        ui.event.preventDefault();
        ui.stopEventPropagation();
      }

      else if (ui.event.key === "Backspace") {
        value = deleteAt(value, cursor);
        cursor = setCursor(value, cursor - 1);
        ui.event.preventDefault();
        ui.stopEventPropagation();
      }

      else if (ui.event.key === "Escape") {
        ui.focus = null;
        ui.event.preventDefault();
        ui.stopEventPropagation();
      }

      else if (ui.event.key === "Enter") {
        // We can't focus on the next control yet, because it hasn't
        // been rendered! Instead we have to wait until after the
        // current frame has been rendererd, then trigger another
        // render.
  
        ui.addAfterRenderCallback(() => {
          ui.focusNextControl();
          ui.enqueueRender();
        });

        ui.event.preventDefault();
        ui.stopEventPropagation();
      }

      else if (isValidKey) {
        console.log(ui.event.which)
        let key = ui.event.key;
        value = insertAt(value, cursor, key);
        cursor = setCursor(value, cursor + 1);
        ui.event.preventDefault();
        ui.stopEventPropagation();
      }
    }

    let styles = Object.assign(
      {},
      style,
      ui.isFocused() && focusStyle,
      ui.isHovered() && hoverStyle,
      !value && placeholderStyle,
    );

    let caretStyles = Object.assign(
      {},
      styles,
      caretStyle
    );

    for (let i = 0; i < width; i++) {
      let char = (value || placeholder)[i];

      let currentStyle = (ui.isFocused() && i === cursor)
        ? caretStyles
        : styles;

      ui.put(i, 0, char, currentStyle.fg, currentStyle.bg);
    }
  });

  return value;
}
