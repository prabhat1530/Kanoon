const cloudscraper = require("cloudscraper");
const cheerio = require("cheerio");
const xlsx = require("xlsx");
const Table = require("cli-table3"); // For beautiful console output

// Configuration
const base_url = "https://indiankanoon.org/browse/";
const courts = { "Allahabad High Court": "Allahabad", "Bombay High Court": "Bombay" };
const dateFilters = ["2024-01", "2024-02", "2024-03"]; // Jan, Feb, Mar 2024

async function scrapeData() {
  let data = [];
  let table = new Table({
    head: ["Court", "Case Title", "Bench", "Grey Box", "Judgement"],
    colWidths: [25, 50, 30, 20, 50], // Adjust column widths
    wordWrap: true,
  });

  for (const [courtName, courtParam] of Object.entries(courts)) {
    for (const dateFilter of dateFilters) {
      console.log(`🔍 Scraping ${courtName} for ${dateFilter}...`);

      let url = `${base_url}?formInput=court%3A${courtParam}+fromdate%3A${dateFilter}-01+todate%3A${dateFilter}-31`;

      try {
        let body = await cloudscraper.get(url);
        let $ = cheerio.load(body);

        // Get all case links
        let caseLinks = [];
        $("a.result_title").each((i, el) => {
          caseLinks.push("https://indiankanoon.org" + $(el).attr("href"));
        });

        if (caseLinks.length === 0) {
          console.log(`⚠ No cases found for ${courtName} in ${dateFilter}`);
          continue;
        }

        for (let caseUrl of caseLinks) {
          console.log(`📜 Fetching Case: ${caseUrl}`);
          let caseBody = await cloudscraper.get(caseUrl);
          let casePage = cheerio.load(caseBody);

          let caseDetails = {
            title: casePage(".docsource_main").text().trim() || "N/A",
            bench: casePage(".doc_bench").text().trim() || "N/A",
            greyBox: casePage("#pre_1").text().trim() || "N/A",
            judgement: casePage(".judgments").text().trim() || "N/A",
          };

          // Format and add data to the table
          table.push([
            courtName,
            caseDetails.title.substring(0, 50), // Truncate long text
            caseDetails.bench.substring(0, 30),
            caseDetails.greyBox.substring(0, 20),
            caseDetails.judgement.substring(0, 50),
          ]);

          data.push([
            courtName,
            caseDetails.title,
            caseDetails.bench,
            caseDetails.greyBox,
            caseDetails.judgement,
          ]);
        }
      } catch (err) {
        console.log(`❌ Error scraping ${courtName} - ${dateFilter}:`, err.message);
      }
    }
  }

  console.log("\n📊 Scraped Cases:");
  console.log(table.toString()); // Print formatted table to console
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
  xlsx.writeFile(workbook, "court_cases.xlsx");
  console.log("✅ Data saved to court_cases.xlsx");
}

// Run Scraper
scrapeData();
