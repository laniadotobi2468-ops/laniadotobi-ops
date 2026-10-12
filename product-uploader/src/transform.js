"use strict";
/**
 * transform.js — הלוגיקה העסקית של הקמת מוצר (ללא רשת, ניתן לבדיקה).
 *
 * כל הכללים מהחוברת + ההנחיות שלך מרוכזים כאן:
 *  - אסור מחיר עגול  → charmPrice (1500 → 1499)
 *  - תיאור מוצר עם 7 סעיפי החובה
 *  - מילות מפתח מופרדות בפסיקים
 *  - ברירות מחדל לווריאנטים (משלוח עד הבית / איסוף עצמי)
 */

/** מחזיר את הערך הקרוב ביותר שמסתיים ב-9 ואינו גדול מהמחיר (תמחור "לא עגול"). */
function charmPrice(input) {
  const p = Math.round(Number(input));
  if (!Number.isFinite(p) || p <= 0) return null;
  const last = p % 10;
  return last >= 9 ? p : p - (last + 1); // 1500→1499, 250→249, 205→199
}

/** האם המחיר "עגול" (מסתיים ב-0)? */
function isRoundPrice(input) {
  const p = Math.round(Number(input));
  return Number.isFinite(p) && p > 0 && p % 10 === 0;
}

/** מנרמל מחיר לפי הכלל: אם עגול — מוריד ל-x99. אחרת משאיר. */
function applyCharm(input) {
  if (input == null || input === "") return "";
  return isRoundPrice(input) ? charmPrice(input) : Math.round(Number(input));
}

/** מילות מפתח: כל מפריד (רווח/פסיק) → רשימה נקייה מופרדת בפסיק-רווח. */
function formatKeywords(input) {
  if (Array.isArray(input)) input = input.join(" ");
  return String(input || "")
    .split(/[\s,،]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** מרכיב את טקסט תיאור המוצר עם סעיפי החובה מהחוברת. */
function buildDescription(p) {
  const lines = [];
  if (p.freeText) lines.push(p.freeText.trim(), "");
  lines.push("• פרטים חשובים:");
  if (p.marketValue) lines.push("שווי שוק: " + p.marketValue);
  if (p.deliveryTime) lines.push("זמן אספקה: " + p.deliveryTime);
  if (p.returns) lines.push("ביטול/החזרה: " + p.returns);
  if (p.warranty) lines.push("אחריות: " + p.warranty);
  if (p.companyName || p.servicePhone) {
    lines.push(
      "החברה: " +
        [p.companyName, p.servicePhone ? "טל' שירות " + p.servicePhone : ""]
          .filter(Boolean)
          .join(" · ")
    );
  }
  if (p.pickupAddress) lines.push("איסוף עצמי: " + p.pickupAddress);
  lines.push("התמונה להמחשה בלבד.");
  return lines.join("\n");
}

/**
 * מקבל רשומת מוצר "גולמית" (למשל מהסקרייפר) ומחזיר רשומה מוכנה להקמה:
 * מחיר לא-עגול, ווריאנטים עם מחירים מתוקנים, תיאור מורכב, אזהרות.
 */
function normalizeProduct(raw = {}) {
  const warnings = [];

  const price = applyCharm(raw.price);
  if (isRoundPrice(raw.price)) {
    warnings.push(`המחיר ${raw.price} היה עגול — תוקן ל-${price}.`);
  }

  let variants = Array.isArray(raw.variants) && raw.variants.length
    ? raw.variants
    : [{ name: "משלוח עד הבית", price: raw.price }];
  variants = variants.map((v) => {
    const vp = v.price === "" || v.price == null ? price : applyCharm(v.price);
    if (isRoundPrice(v.price)) {
      warnings.push(`מחיר הוריאנט "${v.name}" (${v.price}) היה עגול — תוקן ל-${vp}.`);
    }
    return { name: v.name, price: vp };
  });

  if (!raw.supplier) warnings.push("חסר ספק סחורה — חובה כדי לקבל דוח הזמנות!");
  if (!raw.name) warnings.push("חסר שם מוצר.");

  const keywords = formatKeywords(raw.keywords);

  const normalized = {
    name: raw.name || "",
    parentGroup: raw.parentGroup || "",
    marketingAgent: raw.marketingAgent || "",
    supplier: raw.supplier || "",
    cost: raw.cost ?? "",
    price,
    variants,
    stock: raw.stock ?? "",
    purchaseLimit: raw.purchaseLimit ?? "",
    freeText: raw.freeText || "",
    marketValue: raw.marketValue || "",
    deliveryTime: raw.deliveryTime || "",
    returns: raw.returns || "",
    warranty: raw.warranty || "",
    companyName: raw.companyName || "",
    servicePhone: raw.servicePhone || "",
    pickupAddress: raw.pickupAddress || "",
    keywords,
    payments: raw.payments ?? "",
    images: Array.isArray(raw.images) ? raw.images : [],
    sourceUrl: raw.sourceUrl || "",
  };
  normalized.description = buildDescription(normalized);
  normalized.warnings = warnings;
  return normalized;
}

module.exports = {
  charmPrice,
  isRoundPrice,
  applyCharm,
  formatKeywords,
  buildDescription,
  normalizeProduct,
};
