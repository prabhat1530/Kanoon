const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const xlsx = require("xlsx");

puppeteer.use(StealthPlugin());

const BASE_URL = "https://indiankanoon.org/search/";
const COURTS = {
  "Allahabad High Court": "Allahabad",
  "Bombay High Court": "Bombay",
};
const DATE_FILTERS = ["2024-01", "2024-02", "2024-03"];

async function scrapeData() {
  const browser = await puppeteer.launch({ headless: false }); // Open real browser
  const page = await browser.newPage();
  let data = [];

  for (const [courtName, courtParam] of Object.entries(COURTS)) {
    for (const dateFilter of DATE_FILTERS) {
      console.log(`🔍 Scraping ${courtName} for ${dateFilter}...`);

      let url = `${BASE_URL}?formInput=court%3A${courtParam}+fromdate%3A${dateFilter}-01+todate%3A${dateFilter}-31`;
      await page.goto(url, { waitUntil: "networkidle2" });
      await page.waitForTimeout(5000); // Wait for Cloudflare challenge

      const caseLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll("a.result_title")).map(link => link.href)
      );

      if (caseLinks.length === 0) {
        console.log(`⚠ No cases found for ${courtName} in ${dateFilter}`);
        continue;
      }

      for (let caseUrl of caseLinks) {
        console.log(`📄 Fetching Case: ${caseUrl}`);
        await page.goto(caseUrl, { waitUntil: "networkidle2" });
        await page.waitForTimeout(3000);

        const caseDetails = await page.evaluate(() => {
          const getText = (selector) => document.querySelector(selector)?.innerText?.trim() || "N/A";
          return {
            title: getText(".docsource_main"),
            bench: getText(".doc_bench"),
            greyBox: getText("#pre_1"),
            judgement: getText(".judgments"),
          };
        });

        data.push([
          courtName,
          caseDetails.title,
          caseDetails.bench,
          caseDetails.greyBox,
          caseDetails.judgement,
        ]);
      }
    }
  }

  await browser.close();
  saveToExcel(data);
}

// Save Data to Excel
function saveToExcel(data) {
  const worksheet = xlsx.utils.aoa_to_sheet([
    ["High Court", "Case Title", "Bench", "Grey Box Text", "Judgement Text"],
    ...data,
  ]);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Cases");
  xlsx.writeFile(workbook, "court_cases.csv");
  console.log("✅ Data saved to court_cases.xlsx");
}

// Run Scraper
scrapeData().catch(console.error);
