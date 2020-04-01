import { Screen } from "./screen.js";
import { DefaultTheme } from "./themes.js";
import { isPointInRect, isPointInside } from "./utils.js";

/**
 * The maximum number of times the UI can be invalidated and re-rendered
 * before the terminal buffers are drawn.
 *
 * This prevents infinite loop scenarios where a render invalidates
 * the ui which triggers a render that invalidates the ui and so on.
 */
const MAX_RENDERS_PER_FRAME = 10;

export class UI {
  /**
   * @param {import("../terminal/index.js").Terminal} terminal
   */
  constructor(terminal) {
    /**
     * The terminal that the UI will render to.
     *
     * @private
     */
    this.terminal = terminal;

    /**
     * A stack of screens that are active in the UI.
     *
     * @private
     * @type {Screen[]}
     */
    this.screens = [];

    /**
     * The theme object that controls read their defaults from.
     */
    this.theme = DefaultTheme;

    /**
     * A stack of bounding boxes
     *
     * @private
     * @type {Geometry.Rect[]}
     */
    this.boundingBoxStack = [];

    /**
     * The current bounding box. This is the box at the top of the
     * [[UI.boundingBoxStack]].
     *
     * @type {Geometry.Rect}
     */
    this.box = null;

    /**
     * A stack of culling rects.
     *
     * @private
     * @type {Geometry.Rect[]}
     */
    this.clipRectStack = [];

    /**
     * The current culling rect. This is the rect at the top of the
     * [[UI.cullingRectStack]]
     *
     * @private
     * @type {Geometry.Rect}
     */
    this.clip = null;

    /**
     * The stack of ids that can be used to qualify control ids.
     *
     * @private
     * @type {any[]}
     */
    this.idStack = [];

    /**
     * A reference to the current fully qualified id.
     *
     * @private
     * @type {string}
     */
    this.currentId = null;

    /**
     * Signals that the UI has rendered a modal screen and therefore
     * controls in screens below it should not be interactive.
     */
    this.isModal = false;

    /**
     * The event that triggered the current render.
     *
     * @public
     * @type {Event}
     */
    this.event = null;

    /**
     * A list of ids of controls that can be focused.
     *
     * @type {any[]}
     */
    this.focusableControlIds = [];

    /**
     * The id of the widget that has focus.
     */
    this.focus = null;

    /**
     * The id of the widget that is has hover.
     */
    this.hover = null;

    /**
     * The id of the widget that is active.
     */
    this.active = null;

    /**
     * Key value store for components.
     *
     * @readonly
     */
    this.store = new Map();

    /**
     *
     */
    this.mouse = {
      x: -1,
      y: -1,
      buttons: new Set(),
    };

    /**
     * @type {Record<string | number, boolean>}
     */
    this.keys = {};

    /**
     * Flag to specify whether the current state of the UI has been
     * marked as needing another render.
     *
     * @private
     * @internal
     * @type {boolean}
     */
    this.invalidated = false;

    /**
     * List of callbacks to run after the current render.
     *
     * @private
     * @internal
     * @type {(() => any)[]}
     */
    this.afterRenderCallbacks = [];

    /**
     * Bound version of [[UI._dispatchEvent]] that an be passed directly
     * to event handlers.
     *
     * @type {(event: Event) => any}
     */
    this.dispatchEvent = this._dispatchEvent.bind(this);

    // Start listening for events.
    this.addEventListeners();
  }

  /**
   * Write a value to [[UI.store]].
   *
   * @param {string} key The key to store the value under
   * @param {any} value The value to store
   */
  setValue(key, value) {
    return this.store.set(key, value);
  }

  /**
   * Read a value from [[UI.store]].
   *
   * @template T
   * @param {string} key The key to read from
   * @param {T} [defaultValue] A default value to use if there is no value
   * stored under this key.
   */
  getValue(key, defaultValue) {
    if (this.store.has(key)) {
      return this.store.get(key);
    } else {
      return defaultValue;
    }
  }

  /**
   * Set a value in [[UI.store]]. The value will be namespaced with the
   * current id.
   *
   * @param {string} key The local key to write to
   * @param {any} value The value to store
   */
  setLocalValue(key, value) {
    return this.setValue(`${this.currentId}:${key}`, value);
  }

  /**
   * Get a value from [[UI.store]]. The value will be namespaced with the
   * current id.
   *
   * @template T
   * @param {string} key The local key to read from
   * @param {T} [defaultValue] A default value to use if there is no value
   * stored under this key.
   */
  getLocalValue(key, defaultValue) {
    return this.getValue(`${this.currentId}:${key}`, defaultValue);
  }

  /**
   * Add the id of a control that can be focused.
   *
   * @param {any} id
   */
  addFocusableControl(id) {
    this.focusableControlIds.push(id);
  }

  /**
   * Move the focus to the next focusable control.
   */
  focusNextControl() {
    let index = this.focusableControlIds.indexOf(this.focus);
    let end = this.focusableControlIds.length - 1;
    let newIndex = index === end ? 0 : index + 1;
    this.focus = this.focusableControlIds[newIndex];
  }

  /**
   * Move the focus to the previous focusable control.
   */
  focusPreviousControl() {
    let index = this.focusableControlIds.indexOf(this.focus);
    let end = this.focusableControlIds.length;
    let newIndex = (index ? index : end) - 1;
    this.focus = this.focusableControlIds[newIndex];
  }

  /**
   * Push a control id onto the stack to help uniquely identify the
   * current control.
   *
   * @param {any} id
   */
  pushId(id) {
    this.idStack.push(id);
    this.currentId = this.idStack.join("/");
  }

  /**
   * Remove the current id from the id stack.
   */
  popId() {
    this.idStack.pop();
    this.currentId = this.idStack.join("/");
  }

  /**
   * Get the full id for the current control.
   */
  getId() {
    return this.currentId;
  }

  /**
   * Add a screen to this UI.
   *
   * @param {Screen} screen
   * @return {Screen}
   */
  pushScreen(screen) {
    screen._bind(this);
    screen.enter();
    this.screens.push(screen);
    return screen;
  }

  /**
   * Remove the top screen from this UI.
   *
   * @return {Screen} The screen that was popped
   */
  popScreen() {
    let screen = this.screens.pop();
    screen.exit();
    screen._unbind();
    return screen;
  }

  /**
   * Push a relative bounding box onto the stack. This bounding box will
   * be positioned relatively to the current bounding box.
   *
   * Calls to [[UI.put]] will be transformed to the coordinates of this
   * bounding box.
   *
   * @param {number} x Grid x coordinate
   * @param {number} y Grid y coordinate
   * @param {number} width Box width (in cells)
   * @param {number} height Box height (in cells)
   */
  pushBoundingBox(x, y, width, height) {
    let box = { x, y, width, height };

    if (this.box) {
      box.x += this.box.x;
      box.y += this.box.y;
    }

    this.boundingBoxStack.push(box);
    this.box = box;
  }

  /**
   * Remove the current bounding box from the stack.
   */
  popBoundingBox() {
    if (this.boundingBoxStack.length > 0) {
      this.boundingBoxStack.pop();
      this.box = this.boundingBoxStack[this.boundingBoxStack.length - 1];
    } else {
      throw new Error("Cannot pop the root bounding box!");
    }
  }

  /**
   * Push a new clip rect onto the stack. The clip rect will
   * prevent cells from being rendered outside its bounds.
   *
   * @param {number} x X coordinate
   * @param {number} y Y coordinate
   * @param {number} width Box width (in cells)
   * @param {number} height Box height (in cells)
   */
  pushClipRect(x, y, width, height) {
    let rect = { x, y, width, height };

    if (this.box) {
      rect.x += this.box.x;
      rect.y += this.box.y;
    }

    this.clipRectStack.push(rect);
    this.clip = rect;
  }

  /**
   * Pop the current culling rect.
   */
  popClipRect() {
    this.clipRectStack.pop();
    this.clip = this.clipRectStack[this.clipRectStack.length - 1];
  }

  /**
   * Get the current event.
   */
  getEvent() {
    return this.event;
  }

  /**
   * Stop the current event from propagating any further through the UI.
   */
  stopEventPropagation() {
    let event = this.event;
    this.event = null;
    return event;
  }

  /**
   * Stop the current event from propagating through the UI. If it is
   * a DOM event prevent its default behaviour.
   */
  stopEventDefault() {
    if (this.event instanceof Event) {
      this.event.preventDefault();
    }

    this.stopEventPropagation();
  }

  /**
   * Dispatch an event to this UI.
   *
   * @param {Event} event
   * @private
   * @internal
   */
  _dispatchEvent(event) {
    let shouldRender = this.initialEventHandler(event);

    if (!shouldRender) {
      return;
    }

    // Expose the event for the upcoming render.
    this.event = event;

    this.render();

    // If the event was not stopped during the render, then handle it
    // globally instead.
    if (this.event && event.defaultPrevented === false) {
      this.event = null;
      this.defaultEventHandler(event);
    }
  }

  /**
   * Handles incoming events and returns a boolean to
   * a re-render.
   *
   * @private
   * @internal
   * @param {Event} event
   * @return {boolean}
   */
  initialEventHandler(event) {
    if (event instanceof MouseEvent) {
      switch (event.type) {
        case "mousemove": {
          let { clientX, clientY } = event;
          let { x, y } = this.terminal.screenToGrid(clientX, clientY);

          x = Math.floor(x);
          y = Math.floor(y);

          // Don't trigger a re-render if the cursor hasn't actually
          // changed cells.
          if (x === this.mouse.x && y === this.mouse.y) {
            return false;
          }

          this.mouse.x = x;
          this.mouse.y = y;
          break;
        }

        case "mousedown":
          this.mouse.buttons.add(event.button);
          this.mouse.down = true;
          break;

        case "mouseup":
          this.mouse.buttons.delete(event.button);
          this.mouse.down = false;
          break;
      }
    }


    return true;
  }

  /**
   * @private
   * @internal
   * @param {Event} event
   */
  defaultEventHandler(event) {
    if (event instanceof KeyboardEvent && event.type === "keydown") {
      if (event.key === "Tab") {
        if (event.shiftKey) {
          this.focusPreviousControl();
        } else {
          this.focusNextControl();
        }

        event.preventDefault();

        this.render();
      }
    }
  }

  /**
   * Add default event listeners for this ui.
   */
  addEventListeners() {
    window.addEventListener("keydown", this.dispatchEvent);
    window.addEventListener("keyup", this.dispatchEvent);
    window.addEventListener("mousemove", this.dispatchEvent);
    window.addEventListener("mousedown", this.dispatchEvent);
    window.addEventListener("mouseup", this.dispatchEvent);
    window.addEventListener("click", this.dispatchEvent);
    window.addEventListener("contextmenu", this.dispatchEvent);
    window.addEventListener("wheel", this.dispatchEvent, { passive: false });
  }

  /**
   * Remove default event listeners for this ui.
   */
  removeEventListeners() {
    window.removeEventListener("keydown", this.dispatchEvent);
    window.removeEventListener("keyup", this.dispatchEvent);
    window.removeEventListener("mousemove", this.dispatchEvent);
    window.removeEventListener("mousedown", this.dispatchEvent);
    window.removeEventListener("mouseup", this.dispatchEvent);
    window.removeEventListener("click", this.dispatchEvent);
    window.removeEventListener("contextmenu", this.dispatchEvent);
    window.removeEventListener("wheel", this.dispatchEvent);
  }

  /**
   * Put a character into the current terminal relative to the current
   * bounding box. If (x, y) is outside the current culling rect then
   * nothing will be drawn.
   *
   * @param {number} x
   * @param {number} y
   * @param {number | string} char
   * @param {number} fg
   * @param {number} [bg]
   * @param {number} [layer]
   */
  put(x, y, char, fg, bg, layer) {
    x = this.box.x + x;
    y = this.box.y + y;

    for (let rect of this.clipRectStack) {
      if (!isPointInRect(x, y, rect)) {
        return;
      }
    }

    this.terminal.put(x, y, char, fg, bg, layer);
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  isCellVisible(x, y) {
    if (this.clip && !isPointInRect(x, y, this.clip)) {
      return false;
    }

    // TODO: Check whether anything is rendered here already. We can do
    // this by checking the layer in the drawing buffer

    return true;
  }

  /**
   * Check whether the current id is active.
   */
  isActive() {
    return this.currentId === this.active;
  }

  /**
   * Check whether the current id is hovered.
   */
  isHovered() {
    return this.currentId === this.hover;
  }

  /**
   * Check whether the current id is focused.
   */
  isFocused() {
    return this.currentId === this.focus;
  }

  /**
   * Check whether a given mouse button is down (defaults to LMB)
   */
  isMouseDown(button = 0) {
    return this.mouse.buttons.get(button);
  }

  /**
   * Check whether a given key is down. Can be given as a key code or as
   * the name of the key.
   */
  isKeyDown(keyOrKeyCode) {
    return this.keys[keyOrKeyCode];
  }

  /**
   * Check whether the mouse is inside a rectangle relative to the current
   * bounding box.
   *
   * Defaults to checking whether the mouse is inside the current bounding
   * box.
   *
   * @param {number} [x] The x coordinate of the top left of the rectangle
   * @param {number} [y] The y coordinate of the top left of the rectangle
   * @param {number} [width] The width of the rectangle
   * @param {number} [height] The height of the rectangle
   * @return {boolean} True if the mouse cursor is in this rectangle
   */
  isMouseOver(x = 0, y = 0, width = this.box.width, height = this.box.height) {
    let x0 = this.box.x + x;
    let y0 = this.box.y + y;
    let x1 = x0 + width - 1;
    let y1 = y0 + height - 1;
    return isPointInside(this.mouse.x, this.mouse.y, x0, y0, x1, y1);
  }

  /**
   * Mark the current state of the ui as invalid which will cause
   * another render pass before the changes are flushed to the terminal.
   */
  invalidate() {
    this.invalidated = true;
  }

  /**
   * Draw the active screens.
   */
  render() {
    UI.current = this;

    // Keep rendering until there are no scheduled renders remaining or
    // we hit the max number of allowed renders per frame.

    for (let i = 1; i <= MAX_RENDERS_PER_FRAME; i++) {
      this.afterRenderCallbacks = [];

      this.invalidated = false;

      // Push a bounding box that matches the current size of the terminal
      this.pushBoundingBox(0, 0, this.terminal.width, this.terminal.height);

      // Reset the focusable control ids
      this.focusableControlIds = [];

      // Reset the modal screen state
      this.isModal = false;

      // Render the screens from top to bottom, so that as we're rendering
      // the screen can check whether it's hidden by something above it.

      for (let i = this.screens.length - 1; i >= 0; i--) {
        let screen = this.screens[i];

        screen.render();

        // If a screen is opaque then the screens behind it can't be
        // seen and we don't need to render them.

        if (screen.isOpaque) {
          break;
        }

        // If a screen is modal then we need to let controls in the
        // screens behind it that they should not be interactive.

        if (screen.isModal) {
          this.isModal = true;
        }
      }

      this.popBoundingBox();

      if (this.boundingBoxStack.length > 0) {
        console.warn("There are bounding boxes on the stack. Perhaps you forgot to popBoundingBox somewhere?")
        console.log(this.boundingBoxStack)
      }

      for (let callback of this.afterRenderCallbacks) {
        callback();
      }

      if (this.invalidated === false) {
        break;
      }

      this.terminal.clearDrawingBuffer();
    }

    // Flush the changes to the terminal's canvas
    this.terminal.render();

    UI.current = null;
  }

  /**
   *
   * @param {() => any} callback
   */
  addAfterRenderCallback(callback) {
    this.afterRenderCallbacks.push(callback);
  }
}

/**
 * Keep a reference to the UI we're currently rendering so that
 * we don't have to pass a reference to it to every single control.
 *
 * @type {UI}
 */
UI.current = null;
