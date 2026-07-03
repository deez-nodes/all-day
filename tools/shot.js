import { mkdirSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { createServer } from "vite";

const CHROME_PATH =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT_DIR = process.argv[2] || "shots";
const VIEWPORT = { width: 844, height: 390 };
const CANVAS_SELECTOR = "canvas";
const FIRST_FRAME_SETTLE_MS = 800;
const BOOT_SHOT = "shot-boot.png";

mkdirSync(OUT_DIR, { recursive: true });

const server = await createServer({ server: { port: 0 } });
await server.listen();
const url = server.resolvedUrls.local[0];

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ["--no-sandbox", "--hide-scrollbars"],
  defaultViewport: VIEWPORT,
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const shoot = (name) => page.screenshot({ path: path.join(OUT_DIR, name) });

await page.goto(url, { waitUntil: "load" });
await page.waitForSelector(CANVAS_SELECTOR);
await wait(FIRST_FRAME_SETTLE_MS);
await shoot(BOOT_SHOT);

await browser.close();
await server.close();

if (errors.length) {
  console.error("PAGE ERRORS:\n" + errors.join("\n"));
  process.exit(1);
}
console.log(BOOT_SHOT + " written to " + OUT_DIR + ", no page errors");
