import { Terminal } from "../terminal/index.js";

let terminal = new Terminal({
  width: 16,
  height: 16,
  scale: 2,
});

function loop() {
  requestAnimationFrame(loop);

  // Fill with random cells
  for (let x = 0; x < terminal.width; x++) {
    for (let y = 0; y < terminal.height; y++) {
      let char = Math.random() * 255 | 0;
      let fg = Math.random() * 0xFFFFFFFF | 0;
      let bg = Math.random() * 0xFFFFFFFF | 0;
      terminal.put(x, y, char, fg, bg, 0);
    }
  }

  terminal.render();
}

terminal.font.onLoad(loop);
document.body.appendChild(terminal.canvas);
