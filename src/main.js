import Phaser from "phaser";
import { DOM } from "./constants.js";
import {
  COLOR_KITCHEN_BACKDROP,
  GAME_HEIGHT,
  GAME_PARENT_ID,
  GAME_WIDTH,
} from "./config.js";
import { KitchenScene } from "./scene/KitchenScene.js";
import "./styles.css";

new Phaser.Game({
  type: Phaser.CANVAS,
  parent: GAME_PARENT_ID,
  canvas: document.getElementById(DOM.scene),
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLOR_KITCHEN_BACKDROP,
  scale: { mode: Phaser.Scale.NONE },
  scene: [KitchenScene],
});
