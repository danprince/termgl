import { Font } from "./font.js";
import { Buffer } from "./buffer.js";

const VERTEX_SHADER = `
  attribute vec2 a_vertex_coord;
  attribute vec2 a_texture_coord;
  attribute vec4 a_fg_color;
  attribute vec4 a_bg_color;

  varying vec2 v_texture_coord;
  varying vec4 v_fg_color;
  varying vec4 v_bg_color;

  uniform vec2 u_resolution;
  uniform vec2 u_cell_resolution;
  uniform vec2 u_texture_resolution;

  const vec2 flip = vec2(1, -1);

  void main() {
    v_fg_color = a_fg_color;
    v_bg_color = a_bg_color;

    // normalize texture coordinates
    v_texture_coord = (a_texture_coord * u_cell_resolution) / u_texture_resolution;

    // normalize vertex coordinates
    vec2 position = (a_vertex_coord * u_cell_resolution) / u_resolution;

    // convert vertex coordinates to clip space
    position = (position * 2.0 - 1.0) * flip;

    gl_Position = vec4(position, 0, 1);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;

  varying vec2 v_texture_coord;
  varying vec4 v_fg_color;
  varying vec4 v_bg_color;

  uniform sampler2D u_texture;
  uniform bool u_graphical;
  uniform vec4 u_transparent_color;

  void main() {
    vec4 color = texture2D(u_texture, v_texture_coord);

    if (u_graphical) {
      gl_FragColor = color;
    }

    else if (color == u_transparent_color) {
      gl_FragColor = v_bg_color;
    }

    else {
      gl_FragColor = v_fg_color * color;
    }
  }
`;

export class Terminal {
  /**
   * @param {object} settings
   * @param {number} [settings.width] The width (in cells) of the terminal
   * @param {number} [settings.height] The height (in cells) of the terminal
   * @param {number} [settings.scale] The scaling factor for the terminal's canvas
   * @param {Font} [settings.font] The font to use for rendering
   * @param {HTMLCanvasElement} [settings.canvas] The canvas element to render to
   */
  constructor({
    width = 80,
    height = 25,
    scale = 1,
    font = Font.default,
    canvas = document.createElement("canvas"),
  }) {
    /**
     * The width (in cells) of the terminal
     * @readonly
     * @type {number}
     */
    this.width = width;

    /**
     * The height (in cells) of the terminal
     * @readonly
     * @type {number}
     */
    this.height = height;

    /**
     * @private
     * @readonly
     * @type {number}
     */
    this.scale = scale;

    /**
     * The font that the terminal will use to render its display.
     * @type {Font}
     */
    this.font = font;

    /**
     * A readonly buffer that holds the current state of the screen.
     *
     * @private
     * @type {Buffer}
     */
    this.frontBuffer = new Buffer(width, height);

    /**
     * An editable buffer that the terminal writes to when you call
     * [[Terminal.put]].
     *
     * @private
     * @type {Buffer}
     */
    this.backBuffer = new Buffer(width, height);

    /**
     * The canvas element the terminal will render to.
     *
     * @public
     * @readonly
     * @type {HTMLCanvasElement}
     */
    this.canvas = canvas;

    // Keeps the rendering crisp even when zoomed in or scaled up
    this.canvas.style.imageRendering = "pixelated";
    this.canvas.style.transformOrigin = "center";
    this.canvas.style.transform = `scale(${scale})`;

    /**
     * The WebGL context for the terminal.
     *
     * @private
     * @readonly
     * @type {WebGLRenderingContext}
     */
    this.gl = this.canvas.getContext("webgl", {
      preserveDrawingBuffer: true
    });

    let gl = this.gl;
    let program = gl.createProgram();
    let vertexShader = gl.createShader(gl.VERTEX_SHADER);
    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, VERTEX_SHADER);
    gl.shaderSource(fragmentShader, FRAGMENT_SHADER);

    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      let message = gl.getShaderInfoLog(vertexShader);
      gl.deleteShader(vertexShader);
      throw new Error(message);
    }

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      let message = gl.getShaderInfoLog(fragmentShader);
      gl.deleteShader(fragmentShader);
      throw new Error(message);
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      throw new Error(gl.getProgramInfoLog(program));
    }

    gl.useProgram(program);

    /**
     * WebGL uniform locations
     *
     * @private
     * @readonly
     */
    this.uniforms = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      texture: gl.getUniformLocation(program, "u_texture"),
      textureResolution: gl.getUniformLocation(program, "u_texture_resolution"),
      cellResolution: gl.getUniformLocation(program, "u_cell_resolution"),
      graphical: gl.getUniformLocation(program, "u_graphical"),
      transparentColor: gl.getUniformLocation(program, "u_transparent_color"),
    };

    /**
     * WebGL attribute locations
     *
     * @private
     * @readonly
     */
    this.attributes = {
      vertexCoord: gl.getAttribLocation(program, "a_vertex_coord"),
      textureCoord: gl.getAttribLocation(program, "a_texture_coord"),
      fgColor: gl.getAttribLocation(program, "a_fg_color"),
      bgColor: gl.getAttribLocation(program, "a_bg_color"),
    };

    /**
     * WebGL buffers
     *
     * @private
     * @readonly
     */
    this.buffers = {
      vertexCoords: gl.createBuffer(),
      textureCoords: gl.createBuffer(),
      fgColors: gl.createBuffer(),
      bgColors: gl.createBuffer(),
    };

    gl.enableVertexAttribArray(this.attributes.vertexCoord);
    gl.enableVertexAttribArray(this.attributes.textureCoord);
    gl.enableVertexAttribArray(this.attributes.fgColor);
    gl.enableVertexAttribArray(this.attributes.bgColor);

    // For each cell we render a rect with 2 triangles (3 vertices each)
    let vertexCount = this.width * this.height * 2 * 3;

    /**
     * The buffer of vertex coordinates for the shaders. They are stored
     * as cell coordinates and transformed to clip space on the GPU.
     *
     * @private
     * @readonly
     */
    this.vertexCoords = new Float32Array(vertexCount * 2);

    /**
     * The buffer of texture coordinates for the shaders. They are
     * stored as font coordinates and transformed to texture
     * coordinates on the GPU.
     *
     * @private
     * @readonly
     */
    this.textureCoords = new Float32Array(vertexCount * 2);

    /**
     * The buffer of foreground colors for the shaders. We store one
     * color per vertex and each color is stored as individual RGBA
     * components.
     *
     * @private
     * @readonly
     */
    this.foregroundColors = new Uint8ClampedArray(vertexCount * 4);

    /**
     * The buffer of background colors for the shaders. We store one
     * color per vertex and each color is stored as individual RGBA
     * components.
     *
     * @private
     * @readonly
     */
    this.backgroundColors = new Uint8ClampedArray(vertexCount * 4);

    /**
     * A DataView into [[Terminal.foregroundColors]]. Allows us to write
     * 32 bit RGBA colors directly without having to extract the
     * components.
     *
     * @private
     * @readonly
     */
    this.foregroundColorsView = new DataView(this.foregroundColors.buffer);

    /**
     * A DataView into [[Terminal.backgroundColors]]. Allows us to write
     * 32 bit RGBA colors directly without having to extract the
     * components.
     *
     * @private
     * @readonly
     */
    this.backgroundColorsView = new DataView(this.backgroundColors.buffer);

    // Set the font once the webgl program is configured
    this.setFont(font);
  }

  /**
   * Set the font for this terminal.
   *
   * @param {Font} font
   */
  async setFont(font) {
    await font.onLoad();

    let { gl, canvas, uniforms } = this;

    this.font = font;

    canvas.width = this.width * font.charWidth;
    canvas.height = this.height * font.charHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, font.image);

    gl.uniform1i(uniforms.texture, 0);
    gl.uniform2f(uniforms.textureResolution, font.image.width, font.image.height);
    gl.uniform2f(uniforms.cellResolution, font.charWidth, font.charHeight);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);

    if (font.graphical) {
      gl.uniform1i(uniforms.graphical, 1);
    }

    if (font.transparentColor) {
      let color = font.transparentColor;

      gl.uniform4f(
        uniforms.transparentColor,
        (color >>> 24) / 255,
        (color >>> 16 & 0xFF) / 255,
        (color >>> 8 & 0xFF) / 255,
        (color & 0xFF) / 255,
      );
    }

    // Clear the front buffer to force a full redraw next time we render
    this.frontBuffer.clear();
  }

  /**
   * Set the contents and colors for the cell at x, y.
   *
   * See [[Buffer.put]]
   *
   * @param {number} x
   * @param {number} y
   * @param {number | string} char
   * @param {number} fg
   * @param {number} [bg]
   * @param {number} [layer]
   */
  put(x, y, char, fg, bg, layer = 0) {
    this.backBuffer.put(x, y, char, fg, bg, layer);
  }

  /**
   * Copy the contents of another buffer to this terminal.
   *
   * See [[Buffer.blit]]
   *
   * @param {Buffer} buffer
   * @param {number} [x]
   * @param {number} [y]
   * @param {number} [w]
   * @param {number} [h]
   * @param {number} [layer]
   */
  blit(buffer, x, y, w, h, layer) {
    this.backBuffer.blit(buffer, x, y, w, h, layer);
  }

  /**
   * Render the contents of the terminal to the canvas.
   */
  render() {
    let { font, frontBuffer, backBuffer } = this;
    let { gl, buffers, attributes } = this;

    if (font === null) {
      return;
    }

    let vertexCount = 0;
    let vertexCoordIndex = 0;
    let textureCoordIndex = 0;
    let colorByteIndex = 0;

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        let i = x + y * this.width;

        if (
          backBuffer.chars[i] === frontBuffer.chars[i] &&
          backBuffer.foreground[i] === frontBuffer.foreground[i] &&
          backBuffer.background[i] === frontBuffer.background[i]
        ) {
          continue;
        }

        let char = backBuffer.chars[i];

        if (font.mapping && char in font.mapping) {
          char = font.mapping[char];
        }

        let fg = backBuffer.foreground[i];
        let bg = backBuffer.background[i];
        let textureX = char % font.columns;
        let textureY = char / font.columns | 0;

        this.vertexCoords[vertexCoordIndex++] = x;
        this.vertexCoords[vertexCoordIndex++] = y;
        this.vertexCoords[vertexCoordIndex++] = x;
        this.vertexCoords[vertexCoordIndex++] = y + 1;
        this.vertexCoords[vertexCoordIndex++] = x + 1;
        this.vertexCoords[vertexCoordIndex++] = y + 1;
        this.vertexCoords[vertexCoordIndex++] = x;
        this.vertexCoords[vertexCoordIndex++] = y;
        this.vertexCoords[vertexCoordIndex++] = x + 1;
        this.vertexCoords[vertexCoordIndex++] = y + 1;
        this.vertexCoords[vertexCoordIndex++] = x + 1;
        this.vertexCoords[vertexCoordIndex++] = y;

        this.textureCoords[textureCoordIndex++] = textureX;
        this.textureCoords[textureCoordIndex++] = textureY;
        this.textureCoords[textureCoordIndex++] = textureX;
        this.textureCoords[textureCoordIndex++] = textureY + 1;
        this.textureCoords[textureCoordIndex++] = textureX + 1;
        this.textureCoords[textureCoordIndex++] = textureY + 1;
        this.textureCoords[textureCoordIndex++] = textureX;
        this.textureCoords[textureCoordIndex++] = textureY;
        this.textureCoords[textureCoordIndex++] = textureX + 1;
        this.textureCoords[textureCoordIndex++] = textureY + 1;
        this.textureCoords[textureCoordIndex++] = textureX + 1;
        this.textureCoords[textureCoordIndex++] = textureY;

        for (let i = 0; i < 6; i++) {
          this.foregroundColorsView.setUint32(colorByteIndex, fg);
          this.backgroundColorsView.setUint32(colorByteIndex, bg);
          colorByteIndex += 4;
        }

        vertexCount += 6;
      }
    }

    // Use TypedArray#subarray to create cheap views that only include
    // data for the vertices that have changed. This reduces the size
    // of the buffers that we upload to the GPU.

    let vertexCoords = this.vertexCoords.subarray(0, vertexCount * 2);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexCoords);
    gl.bufferData(gl.ARRAY_BUFFER, vertexCoords, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(attributes.vertexCoord, 2, gl.FLOAT, false, 0, 0);

    let textureCoords = this.textureCoords.subarray(0, vertexCount * 2);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoords);
    gl.bufferData(gl.ARRAY_BUFFER, textureCoords, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(attributes.textureCoord, 2, gl.FLOAT, false, 0, 0);

    let foregroundColors = this.foregroundColors.subarray(0, vertexCount * 4);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.fgColors);
    gl.bufferData(gl.ARRAY_BUFFER, foregroundColors, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(attributes.fgColor, 4, gl.UNSIGNED_BYTE, true, 0, 0);

    let backgroundColors = this.backgroundColors.subarray(0, vertexCount * 4);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.bgColors);
    gl.bufferData(gl.ARRAY_BUFFER, backgroundColors, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(attributes.bgColor, 4, gl.UNSIGNED_BYTE, true, 0, 0);

    if (vertexCount > 0) {
      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    }

    // Swap the buffers so that the front buffer reflects the current
    // state of the screen, then reset the back buffer for drawing.

    this.frontBuffer = backBuffer;
    this.backBuffer = frontBuffer;
    this.backBuffer.clear();
  }

  /**
   * Convert from absolute screen coordinates to cell coordinates.
   *
   * @param {number} x
   * @param {number} y
   */
  screenToGrid(x, y) {
    let { left, top } = this.canvas.getBoundingClientRect();
    return this.canvasToGrid(x - left, y - top);
  }

  /**
   * Convert from relative screen coordinates to cell coordinates.
   *
   * @param {number} x
   * @param {number} y
   */
  canvasToGrid(x, y) {
    return {
      x: x / (this.font.charWidth * this.scale),
      y: y / (this.font.charHeight * this.scale),
    };
  }

  /**
   * Convert from cell coordinates to relative screen coordinates.
   *
   * @param {number} x
   * @param {number} y
   */
  gridToCanvas(x, y) {
    return {
      x: x * this.font.charWidth * this.scale,
      y: y * this.font.charHeight * this.scale,
    };
  }
}
