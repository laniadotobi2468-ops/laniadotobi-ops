"use strict";
const test = require("node:test");
const assert = require("node:assert");
const t = require("../src/transform");

test("charmPrice: round numbers drop to x99", () => {
  assert.strictEqual(t.charmPrice(1500), 1499);
  assert.strictEqual(t.charmPrice(200), 199);
  assert.strictEqual(t.charmPrice(50), 49);
  assert.strictEqual(t.charmPrice(1000), 999);
});

test("charmPrice: already ends in 9 stays", () => {
  assert.strictEqual(t.charmPrice(1499), 1499);
  assert.strictEqual(t.charmPrice(49), 49);
});

test("charmPrice: non-round gets nearest lower x9", () => {
  assert.strictEqual(t.charmPrice(205), 199);
  assert.strictEqual(t.charmPrice(1450), 1449);
});

test("charmPrice: invalid input", () => {
  assert.strictEqual(t.charmPrice(0), null);
  assert.strictEqual(t.charmPrice(-5), null);
  assert.strictEqual(t.charmPrice("abc"), null);
});

test("isRoundPrice", () => {
  assert.strictEqual(t.isRoundPrice(1500), true);
  assert.strictEqual(t.isRoundPrice(1499), false);
  assert.strictEqual(t.isRoundPrice(0), false);
});

test("applyCharm only changes round prices", () => {
  assert.strictEqual(t.applyCharm(1500), 1499);
  assert.strictEqual(t.applyCharm(1499), 1499);
  assert.strictEqual(t.applyCharm(1234), 1234);
  assert.strictEqual(t.applyCharm(""), "");
});

test("formatKeywords splits on spaces and commas", () => {
  assert.deepStrictEqual(t.formatKeywords("שואב רובוט ניקיון"), ["שואב", "רובוט", "ניקיון"]);
  assert.deepStrictEqual(t.formatKeywords("a, b ,c"), ["a", "b", "c"]);
  assert.deepStrictEqual(t.formatKeywords(["x", "y"]), ["x", "y"]);
});

test("buildDescription includes mandatory sections and fixed line", () => {
  const d = t.buildDescription({
    freeText: "מוצר מעולה",
    marketValue: "₪2,200",
    deliveryTime: "14 ימים",
    warranty: "שנה",
    companyName: "חברה בע״מ",
    servicePhone: "03-1234567",
  });
  assert.match(d, /מוצר מעולה/);
  assert.match(d, /שווי שוק: ₪2,200/);
  assert.match(d, /זמן אספקה: 14 ימים/);
  assert.match(d, /אחריות: שנה/);
  assert.match(d, /טל' שירות 03-1234567/);
  assert.match(d, /התמונה להמחשה בלבד\./);
});

test("normalizeProduct end-to-end", () => {
  const n = t.normalizeProduct({
    name: "שואב רובוטי",
    supplier: "יבואן בע״מ",
    price: 1500,
    variants: [
      { name: "משלוח עד הבית", price: 1500 },
      { name: "איסוף עצמי", price: 1450 },
    ],
    keywords: "שואב רובוט ניקיון",
    warranty: "שנה",
  });
  assert.strictEqual(n.price, 1499);
  assert.strictEqual(n.variants[0].price, 1499);
  assert.strictEqual(n.variants[1].price, 1449);
  assert.deepStrictEqual(n.keywords, ["שואב", "רובוט", "ניקיון"]);
  assert.ok(n.description.includes("התמונה להמחשה בלבד."));
  assert.ok(n.warnings.some((w) => w.includes("עגול")));
});

test("normalizeProduct warns on missing supplier", () => {
  const n = t.normalizeProduct({ name: "x", price: 99 });
  assert.ok(n.warnings.some((w) => w.includes("ספק")));
  assert.strictEqual(n.variants.length, 1);
  assert.strictEqual(n.variants[0].name, "משלוח עד הבית");
});
