const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

async function navigateToJudgementWithPlaceAndYear(page, place, year) {
  await page.goto(`https://indiankanoon.org/browse/${place}/${year}/`, {
    waitUntil: "networkidle2",
  });

  // Wait for verification element
  await page.waitForSelector("#LLeF5", { timeout: 5000 });

  // Extract verification text
  const text = await page.evaluate(() => {
    return document.querySelector("#LLeF5")?.innerText || "Element not found";
  });

  console.log("Verification Text:", text);
}

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
  );

  await navigateToJudgementWithPlaceAndYear(page, "allahabad", 2024);

  // Keep the browser open for manual interaction
  // await browser.close();
}

main();
