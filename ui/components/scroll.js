import { UI } from "../ui.js";

/**
 * A scrollable component that provides a fixed size viewport into its
 * contents.
 *
 * TODO: Store the scrollOffsets internally.
 *
 * TODO: Make scrollable a control that can be focused and controlled
 * with the arrow keys?
 *
 * @param {object} props
 * @param {UI} [props.ui]
 * @param {any} props.id
 * @param {number} [props.x] The x origin of the viewport
 * @param {number} [props.y] The y origin of the viewport
 * @param {number} [props.width] The visible width of the view
 * @param {number} [props.height] The visible height of the view
 * @param {number} [props.scrollWidth] The total width of the contents
 * @param {number} [props.scrollHeight] The total height of the contents
 * @param {number} props.scrollX The horizontal scroll offset
 * @param {number} props.scrollY The vertical scroll offset
 * @param {number} [props.scrollVelocity] The scrolling speed
 * @param {typeof HorizontalScrollBar} [props.renderHorizontalScrollBar]
 * @param {typeof VerticalScrollBar} [props.renderVerticalScrollBar]
 * @param {() => void} render
 */
export function Scroll({
  ui = UI.current,
  id,
  x = 0,
  y = 0,
  width = ui.box.width,
  height = ui.box.height,
  scrollWidth = width,
  scrollHeight = height,
  renderHorizontalScrollBar = HorizontalScrollBar,
  renderVerticalScrollBar = VerticalScrollBar,
  scrollVelocity = 0.2,
}, render) {
  ui.pushId(id);

  let [scrollX, scrollY] = ui.getLocalValue("scroll", [0, 0]);

  let cullingWidth = width;
  let cullingHeight = height;

  let canScrollX = width < scrollWidth;
  let canScrollY = height < scrollHeight;

  let previousScrollX = scrollX;
  let previousScrollY = scrollY;

  let hasScrolledX = false;
  let hasScrolledY = false;

  if (canScrollX) {
    let length = width;
    let value = scrollX / scrollWidth;
    let handleLength = width / scrollWidth;

    if (canScrollY) {
      length -= 1;
    }

    renderHorizontalScrollBar({
      x: 0,
      y: height - 1,
      value,
      length,
      handleLength,
    });

    cullingHeight -= 1;
  }

  if (canScrollY) {
    let length = height;
    let value = scrollY / scrollHeight;
    let handleLength = height / scrollHeight;

    renderVerticalScrollBar({
      x: width - 1,
      y: 0,
      value,
      length,
      handleLength,
    });

    cullingWidth -= 1;
  }

  ui.pushClipRect(0, 0, cullingWidth, cullingHeight);

  ui.pushBoundingBox(
    Math.round(x - scrollX),
    Math.round(y - scrollY),
    scrollWidth,
    scrollHeight
  );

  render();

  ui.popBoundingBox();
  ui.popClipRect();

  // Handle events after we render the children of this view, in case
  // a child (e.g. a nested scroll) consumed them.

  let event = ui.getEvent();

  if (
    ui.isMouseOver(x, y, width, height) &&
    event instanceof WheelEvent
  ) {
    let { deltaX, deltaY } = ui.event;

    // Use the dominant scrolling direction rather than scrolling
    // on both axes at once.

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      scrollX += deltaX * scrollVelocity;
    } else {
      scrollY += deltaY * scrollVelocity;
    }

    scrollX = Math.max(scrollX, 0);
    scrollY = Math.max(scrollY, 0);
    scrollX = Math.min(scrollX, scrollWidth - width);
    scrollY = Math.min(scrollY, scrollHeight - height);

    hasScrolledX = scrollX != previousScrollX;
    hasScrolledY = scrollY != previousScrollY;

    if (hasScrolledX || hasScrolledY) {
      ui.stopEventDefault();
      ui.invalidate();
    }
  }

  if (hasScrolledX || hasScrolledY) {
    ui.setLocalValue("scroll", [scrollX, scrollY]);
  }

  ui.popId();
}

/**
 * A simple horizontal scrollbar.
 *
 * @param {object} props
 * @param {UI} [props.ui]
 * @param {number} [props.x] The x coordinate for the scrollbar
 * @param {number} [props.y] The y coordinate for the scrollbar
 * @param {number} [props.length] The width of the scrollbar
 * @param {number} [props.value] The normalized value of the handle (0-1)
 * @param {number} [props.handleLength] The normalized size of the handle (0-1) where 1 is the full width
 * @param {any} [props.style] The style for the track
 * @param {any} [props.handleStyle] The style for the track
 */
export function HorizontalScrollBar({
  ui = UI.current,
  x = 0,
  y = 0,
  length,
  value,
  handleLength = 1,
  style = ui.theme.scrollBar,
  handleStyle = ui.theme.scrollBarHandle,
}) {
  let handleIndex = Math.round(value * length);
  let handleSize = Math.round(handleLength * length);

  for (let i = 0; i < length; i++) {
    ui.put(x + i, y, 0, 0, style.bg);
  }

  for (let i = 0; i < handleSize; i++) {
    ui.put(x + handleIndex + i, y, 0, 0, handleStyle.bg);
  }
}

/**
 *
 */
export function VerticalScrollBar({
  ui = UI.current,
  x = 0,
  y = 0,
  length,
  value,
  handleLength = 1,
  style = ui.theme.scrollBar,
  handleStyle = ui.theme.scrollBarHandle,
}) {
  let handleIndex = Math.round(value * length);
  let handleSize = Math.round(handleLength * length);

  for (let i = 0; i < length; i++) {
    ui.put(x, y + i, 0, 0, style.bg);
  }

  for (let i = 0; i < handleSize; i++) {
    ui.put(x, y + handleIndex + i, 0, 0, handleStyle.bg);
  }
}
