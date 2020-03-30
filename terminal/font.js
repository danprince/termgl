export class Font {
  static get default() {
    return new Font({
      url: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABgAQMAAACXC+arAAAABlBMVEUAAAD///+l2Z/dAAAAAXRSTlMAQObYZgAAAmZJREFUKM9VkE9rE0EYxp9OMt2L2DT0D3hx+mYnCx5qTBpy7CbNNtfpdCcLBWnMmuYaJmwWBE+C30PBL+B3qddKwWNhUbAXpe6mocXn8PKbH/My875ggoksIwJPPHH74bQDJ0rt5Scy4KkVtx/tLhh5s+x3nVAkywB05Zwtj3HyzbEu95DKS0Z3gxTx7NTx3MTmd4aWcB9nWZlx667CGlj0KuxRAXzc6KUOA5wDlZtybt7MXDVyAQgAPtC82PUIlWMMN8OugdiDpkVco0EVurupTyAEposdovpuD8uUAdh4Oo+2Aw0Thn29PUgQvR1O7M7AIAjDQJvAIImnR5FMNB4yjhNjFsci75LGbPUUJlMZkUvA4ERGul8Fjoae1Iudh54NjPxKpecKQPgV4ZdzKMWddCy9MXg4lLruGThxa09Lqe+3McIqpbq6n5TRZ8TF6xc1DtOTkSRyEB93PN2qA93VWGhXQyEDV8OXzFFCE4J56yC1MEgmJroYU4paJ7WtJplie+soUmmGrtHbJYgJ08zJPza3xE1oY0wnxpjI01hYSsnaIYr4RdncTJui3AOIYJwf6gyNWWJdoi/QJkJf2jPY1KSNUhWPCb6S4soIPLveVzfnl99zc321d/J8vzDm5nV2Xdwx0oDlZgXEmFRK6QLa0dX5FQ5/3ck+fCBX7eRvbnKQnCv1CIoLThtPDnHOW/xnAdktvX96mMOGapns5Z8GmGJG/A/pDLbEmuDGX5OuE2AR1IaRThJMgkBLExXGWqttG+XVMmBjJkRpAThbVa6ZLgy98ygcASDO1tdHSFP3BRiKiGX9B2nari//rcoAAAAAAElFTkSuQmCC`,
      columns: 16,
      rows: 16,
      transparentColor: 0x00000000,
    });
  }

  /**
   * Font represents a bitmap font that will be used to render for a terminal.
   *
   * @param {object} settings
   * @param {string} settings.url The url for the font's image
   * @param {number} [settings.columns] The number of columns in the font's image
   * @param {number} [settings.rows] The number of rows in the font's image
   * @param {boolean} [settings.graphical] Specify whether the font is already colored
   * @param {number} [settings.transparentColor] Transparency key for the font image in numeric RGBA format
   */
  constructor({
    url,
    columns = 16,
    rows = 16,
    graphical = false,
    transparentColor = 0x00000000,
  }) {
    /**
     * @readonly
     */
    this.image = new Image();
    this.image.src = url;

    /**
     * The width (in characters) of this font.
     *
     * @readonly
     */
    this.columns = columns;

    /**
     * The height (in characters) of this font.
     *
     * @readonly
     */
    this.rows = rows;

    /**
     * Flag representing whether this font can be colored, or whether
     * it is graphical and therefore is already colored.
     *
     * @readonly
     */
    this.graphical = graphical;

    /**
     * The transparency key to remove during rendering. This color will
     * be replaced by the cell's background color.
     *
     * @readonly
     */
    this.transparentColor = transparentColor;
  }

  /**
   * The width in pixels of a single character.
   */
  get charWidth() {
    return this.image.width / this.columns;
  }

  /**
   * The height in pixels of a single character.
   */
  get charHeight() {
    return this.image.height / this.rows;
  }

  /**
   * A helper for ensuring that the font's image has loaded.
   */
  onLoad() {
    return new Promise((resolve, reject) => {
      if (this.image.naturalWidth > 0) {
        resolve();
      } else {
        this.image.addEventListener("load", () => resolve());
        this.image.addEventListener("error", (err) => reject(err))
      }
    });
  }
}
