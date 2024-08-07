import { Canvas } from "./canvas.js";
import { Socket } from "./socket.js";
import { global } from "./global.js";
import { drawConnecting, drawDisconnected, drawEntities } from "./draw.js";
import { fetchAsync, lerp } from "./util.js";

function calculateMouse() {
  global.target.x = Math.round(global.mouse.x - global.screenWidth / 2);
  global.target.y = Math.round(global.mouse.y - global.screenHeight / 2);
}

class Game {
  constructor() {
    global.socket = new Socket("http://localhost:3000/ws");
    this.canvas = new Canvas();
  }

  init() {
    document.getElementById("start").addEventListener("click", this.start);
  }

  start = () => {
    document.getElementById("startmenu").style.display = "none";

    this.loadMockups();
    global.socket.init();
    this.canvas.init();

    window.addEventListener("resize", () => this.canvas.resize());
    window.addEventListener("contextmenu", (event) => event.preventDefault());

    window.requestAnimationFrame(this.update);
  }

  loadMockups = () => {
    let mockupData = fetchAsync("http://localhost:3000/mockups");
    mockupData.then((hexMockups) => {
      let buffer = new Uint8Array(hexMockups.match(/../g).map(h => parseInt(h, 16))).buffer;
      let view = new DataView(buffer);

      for (let offset = 0; offset < view.byteLength;) {
        let mockup = { guns: [], turrets: [] };

        let mockupId = view.getInt32(offset, true);
        offset += 4;
        let size = view.getInt16(offset, true);
        offset += 2;
        let shape = view.getUint8(offset, true);
        offset += 1;

        mockup.id = mockupId;
        mockup.size = size;
        mockup.shape = shape;

        let gunsSize = view.getInt32(offset, true);
        offset += 4;

        for (let i = 0; i < gunsSize; i++) {
          let gunLength = view.getInt16(offset, true);
          offset += 2;
          let gunWidth = view.getInt16(offset, true);
          offset += 2;
          let gunX = view.getFloat32(offset, true);
          offset += 4;
          let gunY = view.getFloat32(offset, true);
          offset += 4;
          let angle = view.getFloat32(offset, true);
          offset += 4;
          let aspect = view.getFloat32(offset, true);
          offset += 4;

          let gun = { length: gunLength, width: gunWidth, x: gunX, y: gunY, angle: angle, aspect: aspect };
          mockup.guns.push(gun);
        }

        let turretsSize = view.getInt32(offset, true);
        offset += 4;

        for (let i = 0; i < turretsSize; i++) {
          let turretSize = view.getInt16(offset, true);
          offset += 2;
          let turretX = view.getFloat32(offset, true);
          offset += 4;
          let turretY = view.getFloat32(offset, true);
          let turretShape = view.getUint8(offset, true);
          offset += 1;

          let turret = { size: turretSize, x: turretX, y: turretY, shape: turretShape };
          mockup.turrets.push(turret);
        }

        global.mockups.set(mockupId, mockup);
      }
    });
  }

  update = () => {
    global.map.width = lerp(global.map.width, global.map.serverData.width, 0.1);
    global.map.height = lerp(global.map.height, global.map.serverData.height, 0.1);

    calculateMouse();

    this.render();

    window.requestAnimationFrame(this.update);
  }

  render = () => {
    this.canvas.clear();

    if (global.gameStart && global.player) {
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const px = global.player.x;
      const py = global.player.y;

      this.canvas.ctx.fillStyle = "#d9d9d9";
      this.canvas.ctx.fillRect(cx - px, cy - py, global.map.width, global.map.height);

      this.canvas.drawGrid(cx - px, cy - py, 32);

      drawEntities(px, py);
    }
    else if (!global.disconnected) {
      drawConnecting();
    }
    if (global.disconnected) {
      drawDisconnected();
    }
  }
}

const game = new Game();
game.init();
