const TRANSPARENT = 0x00000000;
const WHITE = 0xFFFFFFFF;
const BLACK = 0x000000FF;
const RED = 0xFF0000FF;
const GREEN = 0x00FF00FF;
const BLUE = 0x0000FFFF;
const GREY = 0x666666FF;
const DARK_GREY = 0x22222288;
const CYAN = 0x00bcd4ff;
const LIGHT_GREY = 0xccccccff;

export const DefaultTheme = {
  text: {
    fg: WHITE,
  },
  button: {
    default: {
      fg: WHITE,
    },

    hover: {
      fg: GREEN,
    },

    active: {
      fg: RED,
    },

    focus: {
      fg: BLUE,
    },

    disabled: {
      fg: GREY
    },
  },
  input: {
    default: {
      fg: LIGHT_GREY,
      bg: DARK_GREY,
    },

    hover: {
    },

    focus: {
      fg: WHITE
    }
  },
  inputPlaceholder: {
    fg: GREY,
  },
  inputCaret: {
    fg: BLACK,
    bg: WHITE,
  },
  scrollBar: {
    bg: TRANSPARENT,
  },
  scrollBarHandle: {
    bg: GREY
  },
}
