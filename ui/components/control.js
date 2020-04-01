import { UI } from "../ui.js";

/**
 * @param {object} props
 * @param {UI} [props.ui]
 * @param {any} props.id
 * @param {number} [props.x]
 * @param {number} [props.y]
 * @param {number} [props.width]
 * @param {number} [props.height]
 * @param {boolean} [props.disabled]
 * @param {() => any} callback
 */
export function Control({
  ui = UI.current,
  id,
  x = 0,
  y = 0,
  width = ui.box.width,
  height = ui.box.height,
  disabled = false,
}, callback) {
  ui.pushId(id);
  ui.pushBoundingBox(x, y, width, height);

  if (id == null) {
    throw new Error("Control must have an id!");
  }

  id = ui.getId();

  // The control should not be interactive if it is disabled or we are
  // currently rendering behind a modal screen.

  if (!disabled && !ui.isModal) {
    let event = ui.event;

    ui.addFocusableControl(id);

    // TODO: Hover/click should not work if the cell the mouse is over
    // is not visible (e.g. outside culling rect or renderered over)
    //
    // What if something after the control renders over the control?

    if (
      ui.isMouseOver(0, 0, width, height) &&
      ui.isCellVisible(ui.mouse.x, ui.mouse.y)
    ) {
      ui.hover = id;
    }

    else if (ui.hover === id) {
      ui.hover = null;
    }

    if (event) {
      if (
        ui.hover === id &&
        event instanceof MouseEvent &&
        event.type === "mousedown"
      ) {
        ui.active = id;
        ui.focus = id;
      }

      if ((
        ui.active === id &&
        event instanceof MouseEvent &&
        event.type === "mouseup"
      ) || (
        ui.active === id &&
        event instanceof KeyboardEvent &&
        event.type === "keyup" &&
        event.key === "Enter"
      )) {
        ui.active = null;
      }

      if (
        ui.focus === id &&
        ui.event instanceof KeyboardEvent &&
        ui.event.type === "keydown"
      ) {
        if (ui.event.key === "Enter") {
          ui.active = id;
        }
      }

      if (
        ui.active === id &&
        ui.event instanceof KeyboardEvent &&
        ui.event.type === "keyup"
      ) {
        if (ui.event.key === "Enter") {
          ui.active = id;
        }
      }
    }
  }

  callback();

  ui.popBoundingBox();
  ui.popId();
}
