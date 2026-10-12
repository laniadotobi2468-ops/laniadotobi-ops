"use strict";
/**
 * backoffice.js — אוטומציה של הקמת מוצר בבאק אופיס (ashmoret-itu / קניון הגדול).
 *
 * ⚠️ חשוב: זהו שלד. הבוררים (selectors) של המסכים האמיתיים עדיין לא ידועים —
 *    הם מסומנים ב-TODO וממתינים ל-HTML / צילומי מסך של המערכת.
 *    עד שהם ימולאו, הפקודה upload תרוץ רק במצב "יבש" (dryRun): מתחברת, מגיעה
 *    למסך ההקמה, מצלמת מסך — ולא יוצרת מוצר, כדי לא להכניס נתונים שגויים.
 *
 * כשתספק את פרטי המסכים, נמלא כאן את רצף הפעולות המדויק לפי החוברת:
 *   אחזקה ← רשימת מק"טים ← גורם משווק+קבוצת אב ← הצג ← הוסף מק"ט חדש ← ...
 */
const { chromium } = require("playwright");

async function login(page, cfg) {
  const bo = cfg.backoffice || {};
  await page.goto(bo.loginUrl, { waitUntil: "domcontentloaded" });

  // TODO: להתאים לבוררים האמיתיים של דף ההתחברות (שמות שדות ASP.NET).
  const S = bo.selectors && bo.selectors.login ? bo.selectors.login : {};
  await page.fill(S.user || "#txtUserName", cfg.credentials.username);
  await page.fill(S.pass || "#txtPassword", cfg.credentials.password);
  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    page.click(S.submit || "#btnLogin"),
  ]);
}

/**
 * מקימה מוצר יחיד. במצב dryRun רק מתחברת ומצלמת — לא יוצרת.
 * @param {object} product  רשומת מוצר מנורמלת (מ-transform.normalizeProduct)
 * @param {object} cfg      התצורה (config.json)
 * @param {object} opts     { dryRun?: boolean, headless?: boolean }
 */
async function createProduct(product, cfg, opts = {}) {
  const dryRun = opts.dryRun !== false; // ברירת מחדל: יבש, עד שהבוררים יושלמו
  const browser = await chromium.launch({ headless: opts.headless !== false });
  try {
    const page = await browser.newPage();
    await login(page, cfg);

    if (dryRun) {
      const shot = `data/dryrun-${Date.now()}.png`;
      await page.screenshot({ path: shot, fullPage: true });
      return {
        ok: true,
        dryRun: true,
        message: `התחברות הצליחה. צילום מסך נשמר: ${shot}. ` +
                 `להשלמת ההקמה האוטומטית צריך את בוררי מסכי "אחזקה".`,
        product: product.name,
      };
    }

    // ===== TODO: רצף ההקמה המלא לפי החוברת =====
    // 1. ניווט: אחזקה ← רשימת מק"טים
    // 2. בחירת גורם משווק + קבוצת אב ← "הצג" ← "הוסף מק"ט חדש"
    // 3. תיאור (שם) = product.name ; קבוצת אב ; גורם משווק
    // 4. ספק = product.supplier   ← "שמור והמשך"
    // 5. וריאנטים: קבוצה בשם המוצר ← פעיל ← ערכים ← product.variants[].name ← "שמור וצא" ← "השלם וריאנטים"
    // 6. מחיר+עלות לכל וריאנט: product.variants[].price , product.cost
    // 7. מלאי/הגבלה: product.stock , product.purchaseLimit ← "עדכן"
    // 8. תיאור: product.description ; מילות מפתח: product.keywords.join(", ") ; תשלומים: product.payments
    // 9. תמונות: product.images  (ודא 500x500 JPG)
    throw new Error("רצף ההקמה טרם מוגדר — יש לספק את בוררי המסכים (ראה README).");
  } finally {
    await browser.close();
  }
}

module.exports = { login, createProduct };
