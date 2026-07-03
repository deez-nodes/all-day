const path = require("path");
const puppeteer = require("puppeteer-core");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const GAME_PATH = path.join(__dirname, "..", "src", "index.html");
const OUT_DIR = process.argv[2] || __dirname;
const VIEWPORT = { width: 844, height: 390 };
const START_BUTTON = "#btn-start";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--hide-scrollbars"],
    defaultViewport: VIEWPORT,
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const shoot = (name) => page.screenshot({ path: path.join(OUT_DIR, name) });

  await page.goto("file:///" + GAME_PATH.replace(/\\/g, "/"), { waitUntil: "networkidle0" });
  await wait(600);
  await shoot("shot-start.png");

  await page.click(START_BUTTON);
  await wait(2500);
  await shoot("shot-shift.png");

  await page.evaluate(() => {
    tapBank(KIND_ING, "raw_wings");
    tapSlot(ST_FRYER, 0);
  });
  await wait(800);
  await shoot("shot-cooking.png");

  await browser.close();
  if (errors.length) {
    console.error("PAGE ERRORS:\n" + errors.join("\n"));
    process.exit(1);
  }
  console.log("3 screenshots written to " + OUT_DIR + ", no page errors");
})();
