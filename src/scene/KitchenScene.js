import Phaser from "phaser";
import { SCENE_KITCHEN } from "../config.js";
import { createLineGame } from "../line-game.js";
import { createKitchenRenderer } from "./kitchen-renderer.js";

const SIMULATION_INTERVAL_MS = 100;

export class KitchenScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KITCHEN);
  }

  create() {
    const line = createLineGame();
    const renderer = createKitchenRenderer(
      line,
      this.game.canvas,
      this.game.context,
    );
    let width;
    let height;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      this.scale.resize(
        Math.round(width * pixelRatio),
        Math.round(height * pixelRatio),
      );
      renderer.resize(width, height);
    };
    const render = () => renderer.drawScene(width, height);

    resize();
    window.addEventListener("resize", resize);
    this.game.events.on(Phaser.Core.Events.POST_RENDER, render);
    this.time.addEvent({
      delay: SIMULATION_INTERVAL_MS,
      callback: line.tick,
      loop: true,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("resize", resize);
      this.game.events.off(Phaser.Core.Events.POST_RENDER, render);
      renderer.destroy();
    });
  }
}
