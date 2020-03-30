/**
 * Here is some info about the color package.
 *
 * @packageDocumentation
 * @module termgl/color
 */

/**
 * Create a numeric RGBA color from individual byte components.
 *
 * @param {number} r Red component (0-255)
 * @param {number} g Green component (0-255)
 * @param {number} b Blue component (0-255)
 * @param {number} [a] Alpha component (0-255)
 */
export function RGBA(r, g, b, a = 0xFF) {
  return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0
}

/**
 * Create a numeric RGBA color from HSLA components.
 *
 * @param {number} h Hue component (0, 360)
 * @param {number} l Lightness component (0, 1)
 * @param {number} l Saturation component (0, 1)
 * @param {number} [a] Alpha component (0, 1)
 */
export function HSLA(h, s, l, a = 1) {
  let c = (1 - Math.abs((2 * l) - 1)) * s;
  let p = h / 60;
  let x = c * (1 - Math.abs((p % 2) - 1));
  let m = l - (c / 2);
  let r, g, b;

  switch (p | 0) {
    case 0: r = c; g = x; b = 0; break;
    case 1: r = x; g = c; b = 0; break;
    case 2: r = 0; g = c; b = x; break;
    case 3: r = 0; g = x; b = c; break;
    case 4: r = x; g = 0; b = c; break;
    case 5: r = c; g = 0; b = x; break;
  }

  r += m;
  g += m;
  b += m;

  return RGBA(r, g, b, a);
}

/**
 * Stringify a numeric RGBA color.
 *
 * @param {number} color
 * @return {string} A hexadecimal string in the form #RRGGBB or #RRGGBBAA
 */
export function stringify(color) {
  let hasAlpha = (color & 0xFF) < 0xFF;

  if (hasAlpha) {
    return `#${color.toString(16).padStart(8, "0")}`;
  } else {
    return `#${color.toString(16).slice(0, -2).padStart(6, "0")}`;
  }
}

/**
 * Parse a valid CSS color to numeric RGBA format.
 *
 * Can parse the following string formats:
 *
 * #RGB
 * #RGBA
 * #RRGGBB
 * #RRGGBBAA
 * rgb(0, 100, 255)
 * rgba(0, 100, 255, 10%)
 * rgba(0, 100, 255, 0.3)
 * hsl(360, 30%, 50%)
 * hsl(360, 0.3, 0.5)
 * hsla(360, 30%, 50%, 90%)
 * hsla(360, 0.3, 0.5, 0.9)
 *
 * @param {string} string
 * @return {number} Numeric RGBA value for this number.
 */
export function parse(string) {
  let s = string;

  if (s[0] === "#") {
    switch (s.length) {
      case 4: // #RGB
        return parseInt(s[1] + s[1] + s[2] + s[2] + s[3] + s[3] + "FF", 16);
      case 5: // #RGBA
        return parseInt(s[1] + s[1] + s[2] + s[2] + s[3] + s[3] + s[4] + s[4], 16);
      case 7: // #RRGGBB
        return parseInt(s.slice(1) + "FF", 16);
      case 9: // #RRGGBBAA
        return parseInt(s.slice(1), 16);
      default:
        throw new Error(`Invalid hex color: ${s}`);
    }
  }

  else if (/rgba?/i.test(string)) {
    let start = string.indexOf("(");
    let end = string.indexOf(")");
    let parts = string.slice(start, end).split(",");
    let hasAlpha = parts.length === 4;
    let r = parseInt(parts[0]);
    let g = parseInt(parts[1]);
    let b = parseInt(parts[2]);
    let a = hasAlpha ? parseCSSDecimal(parts[3]) * 0xFF : 0xFF;
    return RGBA(r, g, b, a);
  }

  else if (/hsla?/i.test(string)) {
    let start = string.indexOf("(");
    let end = string.indexOf(")");
    let parts = string.slice(start, end).split(",");
    let hasAlpha = parts.length === 4;
    let h = parseCSSDecimal(parts[0]);
    let s = parseCSSDecimal(parts[1]);
    let l = parseCSSDecimal(parts[2]);
    let a = hasAlpha ? parseCSSDecimal(parts[3]) : 1;
    return HSLA(h, s, l, a);
  }

  else {
    throw new Error(`Invalid color format: ${string}`);
  }
}

/**
 * @param {string} string A decimal (e.g. 0.4) or a percentage (e.g 40%)
 * @return {number}
 */
function parseCSSDecimal(string) {
  if (string.indexOf("%") >= 0) {
    return parseFloat(string) / 100;
  } else {
    return parseFloat(string);
  }
}
