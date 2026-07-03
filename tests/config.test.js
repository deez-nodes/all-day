import { expect, it } from "vitest";
import { GAME_HEIGHT, GAME_WIDTH } from "../src/config.js";

it("targets a landscape phone viewport", () => {
  expect(GAME_WIDTH).toBeGreaterThan(GAME_HEIGHT);
  expect(GAME_WIDTH / GAME_HEIGHT).toBeCloseTo(844 / 390, 1);
});
