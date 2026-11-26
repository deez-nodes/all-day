import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { createServer } from "vite";
import { GAME_HEIGHT, GAME_WIDTH } from "../src/config.js";

const CHROME_PATH =
  process.env.CHROME_PATH ||
  (existsSync("/usr/bin/chromium")
    ? "/usr/bin/chromium"
    : "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
const OUT_DIR = process.argv[2] || "shots";
const VIEWPORT = {
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  deviceScaleFactor: 2,
};
const FIRST_FRYER_BASKET = { x: 223, y: 272 };
const ERRORS = ["pageerror", "error"];

mkdirSync(OUT_DIR, { recursive: true });

const server = await createServer({ server: { port: 0 } });
let browser;
try {
  await server.listen();
  browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--hide-scrollbars"],
    defaultViewport: VIEWPORT,
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  for (const event of ERRORS)
    page.on(event, (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const shoot = (name) => page.screenshot({ path: path.join(OUT_DIR, name) });
  await page.goto(server.resolvedUrls.local[0], { waitUntil: "load" });
  await page.waitForFunction(
    (width, height) => {
      const canvas = document.querySelector("#scene");
      return (
        canvas.width === width &&
        canvas.height === height &&
        canvas.getContext("2d").getImageData(0, 0, 1, 1).data[3] === 255
      );
    },
    {},
    VIEWPORT.width * VIEWPORT.deviceScaleFactor,
    VIEWPORT.height * VIEWPORT.deviceScaleFactor,
  );
  await page.waitForSelector("#diff-cards button");
  await shoot("shot-boot.png");

  await page.click("#btn-start");
  await page.waitForSelector("#rail .ticket", { visible: true });
  await shoot("shot-shift.png");

  await page.click("#drawer-tab");
  await page
    .locator('#drawer.open #bank-proteins [data-id="raw_wings"]')
    .click();
  await page.waitForSelector("#hand-chip.show", { visible: true });
  await page.waitForFunction(
    () =>
      document.querySelector("#drawer").getBoundingClientRect().top >=
      window.innerHeight,
  );
  await page.mouse.click(FIRST_FRYER_BASKET.x, FIRST_FRYER_BASKET.y);
  await page.waitForSelector("#hand-chip.show", { hidden: true });
  await page.mouse.click(FIRST_FRYER_BASKET.x, FIRST_FRYER_BASKET.y);
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("#toasts .toast")).some((toast) =>
      toast.textContent.includes("left on Bone-In Wings"),
    ),
  );
  await shoot("shot-cooking.png");

  await page.click("#btn-end");
  await page.waitForSelector("#ov-report:not(.hidden)", { visible: true });
  assert.deepEqual(errors, [], "browser errors");
  console.log(
    "Clock-in, fryer drop and shift report verified. Screenshots written to " +
      OUT_DIR,
  );
} finally {
  await browser?.close();
  await server.close();
}
