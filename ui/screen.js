/**
 * Represents a screen/view in the current UI.
 *
 * @abstract
 */
export class Screen {
  constructor() {
    /**
     * @private
     * @type {import("./ui.js").UI}
     */
    this.ui = null;

    /**
     * Does this screen block input to the screens below it?
     */
    this.isModal = false;

    /**
     * Does this screen hide the screens below it?
     */
    this.isOpaque = false;
  }

  /**
   * @param {import("./ui.js").UI} ui
   * @internal
   */
  _bind(ui) {
    this.ui = ui;
  }

  /**
   * @internal
   */
  _unbind() {
    this.ui = null;
  }

  render() {}
  enter() {}
  exit() {}
}
