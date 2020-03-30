/**
 * A buffer is the raw representation of the contents of a terminal.
 * The terminal will create buffers for you, but it's also possible
 * to create your own and draw to them separately before copying
 * them into the terminal. See [[Buffer.blit]].
 */
export class Buffer {
  /**
   * @param {number} width
   * @param {number} height
   */
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.chars = new Uint32Array(width * height);
    this.foreground = new Uint32Array(width * height);
    this.background = new Uint32Array(width * height);
    this.layers = new Uint32Array(width * height);
  }

  /**
   * Set the value of a cell in this buffer. If the layer is lower than
   * the cell that is already drawn at this position, then it will be
   * ignored.
   *
   * @param {number} x The x position of the cell
   * @param {number} y The y position of the cell
   * @param {number | string} char The character code (or literal character to draw)
   * @param {number} fg The foreground color (in numeric RGBA format)
   * @param {number} [bg] The background color (in numeric RGBA format)
   * @param {number} [layer] The numeric layer
   */
  put(x, y, char, fg, bg, layer = 0) {
    let index = x + y * this.width;
    let code = typeof char === "string" ? char.charCodeAt(0) : char;

    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
      if (layer >= this.layers[index]) {
        this.layers[index] = layer;
        this.chars[index] = code;
        this.foreground[index] = fg;

        if (bg) {
          this.background[index] = bg;
        }
      }
    }
  }

  /**
   * Copy the contents of one buffer into another at a specific
   * coordinate.
   *
   * See: https://en.wiktionary.org/wiki/blit
   *
   * @param {Buffer} buffer
   * @param {number} [x]
   * @param {number} [y]
   * @param {number} [w]
   * @param {number} [h]
   */
  blit(buffer, x = 0, y = 0, w = buffer.width, h = buffer.height, layer = 0) {
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        let index = i + j * buffer.width;

        this.put(
          x + i,
          y + j,
          buffer.chars[index],
          buffer.foreground[index],
          buffer.background[index],
          buffer.layers[index] + layer,
        );
      }
    }
  }

  /**
   * Reset the state of this buffer.
   */
  clear() {
    this.chars.fill(0);
    this.foreground.fill(0);
    this.background.fill(0);
    this.layers.fill(0);
  }
}
