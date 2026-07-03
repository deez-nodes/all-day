import Phaser from "phaser";
import {
  COLOR_KITCHEN_BACKDROP,
  GAME_HEIGHT,
  GAME_PARENT_ID,
  GAME_WIDTH,
} from "./config.js";
import { KitchenScene } from "./scene/KitchenScene.js";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: GAME_PARENT_ID,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLOR_KITCHEN_BACKDROP,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [KitchenScene],
});
