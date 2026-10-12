"use strict";
/**
 * scrape.js — שאיבת נתוני מוצר מאתר הסחר שלך.
 *
 * עובד בשתי שכבות, מהחזק לחלש:
 *   1. JSON-LD (schema.org/Product) — רוב אתרי הסחר (Shopify/Wix/WooCommerce) פולטים את זה.
 *   2. תגיות OpenGraph / meta — גיבוי.
 *   3. בוררים (selectors) מותאמים לאתר — ממלאים ב-config אם צריך דיוק.
 *
 * רץ בדפדפן אמיתי (Playwright) כדי שגם אתרים שנבנים ב-JS יעבדו.
 */
const { chromium } = require("playwright");

function firstImage(img) {
  if (!img) return [];
  if (typeof img === "string") return [img];
  if (Array.isArray(img)) return img.map((x) => (typeof x === "string" ? x : x && x.url)).filter(Boolean);
  if (img.url) return [img.url];
  return [];
}

function fromJsonLd(blocks) {
  for (const raw of blocks) {
    let data;
    try { data = JSON.parse(raw); } catch { continue; }
    const nodes = Array.isArray(data) ? data : (data["@graph"] || [data]);
    for (const node of nodes) {
      const type = node && node["@type"];
      const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
      if (!isProduct) continue;
      const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers || {};
      return {
        name: node.name || "",
        freeText: typeof node.description === "string" ? node.description : "",
        sku: node.sku || node.mpn || "",
        price: offers.price || offers.lowPrice || "",
        currency: offers.priceCurrency || "",
        marketingAgent: (node.brand && (node.brand.name || node.brand)) || "",
        images: firstImage(node.image),
        _source: "json-ld",
      };
    }
  }
  return null;
}

/**
 * @param {string} url  כתובת דף המוצר
 * @param {object} opts { selectors?, headless?, timeout? }
 * @returns {Promise<object>} רשומת מוצר גולמית
 */
async function scrapeProduct(url, opts = {}) {
  const browser = await chromium.launch({ headless: opts.headless !== false });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: opts.timeout || 30000 });

    // 1) JSON-LD
    const ld = await page.$$eval('script[type="application/ld+json"]', (els) => els.map((e) => e.textContent));
    let product = fromJsonLd(ld);

    // 2) OpenGraph / meta fallback
    const og = await page.evaluate(() => {
      const m = (sel) => { const el = document.querySelector(sel); return el ? el.getAttribute("content") : ""; };
      return {
        title: m('meta[property="og:title"]') || document.title || "",
        desc: m('meta[property="og:description"]') || m('meta[name="description"]') || "",
        image: m('meta[property="og:image"]'),
        price: m('meta[property="product:price:amount"]') || m('meta[property="og:price:amount"]') || "",
        currency: m('meta[property="product:price:currency"]') || "",
      };
    });
    if (!product) {
      product = {
        name: og.title, freeText: og.desc, sku: "", price: og.price,
        currency: og.currency, marketingAgent: "", images: og.image ? [og.image] : [],
        _source: "opengraph",
      };
    } else {
      if (!product.images.length && og.image) product.images = [og.image];
      if (!product.freeText) product.freeText = og.desc;
    }

    // 3) בוררים מותאמים (אופציונלי) — גוברים על מה שנמצא אם הוגדרו
    const sel = opts.selectors || {};
    for (const [field, selector] of Object.entries(sel)) {
      try {
        const txt = await page.$eval(selector, (el) => (el.textContent || el.getAttribute("content") || "").trim());
        if (txt) product[field] = txt;
      } catch { /* בורר לא נמצא — מדלגים */ }
    }

    // ניקוי מחיר: "1,499 ₪" → 1499
    if (product.price) {
      const num = String(product.price).replace(/[^\d.]/g, "");
      product.price = num ? Number(num) : "";
    }
    product.sourceUrl = url;
    return product;
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeProduct, fromJsonLd };
