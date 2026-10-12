#!/usr/bin/env node
"use strict";
/**
 * cli.js — ממשק שורת הפקודה.
 *
 *   node src/cli.js scrape <url>              שאיבת מוצר אחד → הדפסה
 *   node src/cli.js prepare <url> [out.json]  שאיבה + נרמול (מחיר לא-עגול, תיאור) → קובץ
 *   node src/cli.js batch <urls.txt> [out]    שאיבה+נרמול לרשימת כתובות → תיקייה
 *   node src/cli.js upload <product.json>     הקמה בבאק אופיס (ברירת מחדל: dry-run)
 *       --go        לבצע הקמה אמיתית (לא יבש) — רק אחרי שהבוררים הושלמו
 *       --show      להריץ עם דפדפן גלוי
 */
const fs = require("fs");
const path = require("path");
const { scrapeProduct } = require("./scrape");
const { normalizeProduct } = require("./transform");
const { createProduct } = require("./backoffice");

function loadConfig() {
  const p = path.join(__dirname, "..", "config.json");
  if (!fs.existsSync(p)) {
    console.error("חסר config.json — העתק את config.example.json ל-config.json ומלא פרטים.");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function cmdScrape(url) {
  const raw = await scrapeProduct(url, { headless: !process.argv.includes("--show") });
  console.log(JSON.stringify(raw, null, 2));
}

async function cmdPrepare(url, out) {
  const raw = await scrapeProduct(url, { headless: !process.argv.includes("--show") });
  const product = normalizeProduct(raw);
  const file = out || `data/product-${Date.now()}.json`;
  fs.writeFileSync(file, JSON.stringify(product, null, 2), "utf8");
  console.log(`נשמר: ${file}`);
  if (product.warnings.length) console.log("אזהרות:\n - " + product.warnings.join("\n - "));
}

async function cmdBatch(listFile, outDir) {
  const urls = fs.readFileSync(listFile, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const dir = outDir || "data/batch";
  fs.mkdirSync(dir, { recursive: true });
  let i = 0;
  for (const url of urls) {
    i++;
    try {
      const product = normalizeProduct(await scrapeProduct(url));
      const file = path.join(dir, `${String(i).padStart(3, "0")}.json`);
      fs.writeFileSync(file, JSON.stringify(product, null, 2), "utf8");
      console.log(`✓ ${i}/${urls.length}  ${product.name || url} → ${file}`);
    } catch (e) {
      console.log(`✗ ${i}/${urls.length}  ${url} — ${e.message}`);
    }
  }
}

async function cmdUpload(file) {
  const product = JSON.parse(fs.readFileSync(file, "utf8"));
  const cfg = loadConfig();
  const dryRun = !process.argv.includes("--go");
  const res = await createProduct(product, cfg, { dryRun, headless: !process.argv.includes("--show") });
  console.log(res.message || JSON.stringify(res));
}

(async () => {
  const [cmd, a, b] = process.argv.slice(2);
  try {
    if (cmd === "scrape" && a) return await cmdScrape(a);
    if (cmd === "prepare" && a) return await cmdPrepare(a, b);
    if (cmd === "batch" && a) return await cmdBatch(a, b);
    if (cmd === "upload" && a) return await cmdUpload(a);
    console.log(fs.readFileSync(path.join(__dirname, "cli-help.txt"), "utf8"));
  } catch (e) {
    console.error("שגיאה:", e.message);
    process.exit(1);
  }
})();
