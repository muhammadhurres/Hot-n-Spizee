import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { cartSubtotal, readCart, saveCart } from "../public/js/cart.js";
import { escapeHtml, filterMenu, formatPrice, loadMenu } from "../public/js/menu.js";
import { openWhatsApp } from "../public/js/whatsapp.js";

const sourceCsv = await readFile(new URL("../public/menu.csv", import.meta.url), "utf8");
const originalFetch = globalThis.fetch;

async function loadFrom(text) {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => text,
  });
  return loadMenu();
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("loads all menu rows with valid prices and unique dish routes", async () => {
  const menu = await loadFrom(sourceCsv);
  assert.equal(menu.length, 56);
  assert.equal(new Set(menu.map((item) => item.slug)).size, menu.length);
  assert.ok(menu.every((item) => Number.isFinite(item.price) && item.price >= 0));
  assert.equal(menu.find((item) => item.name === "Crispy Zinger Burger")?.price, 390);
});

test("filters by dish text and category without matching the category label as dish text", async () => {
  const menu = await loadFrom(sourceCsv);
  const filtered = filterMenu(menu, "biryani", "Rice & Biryani");
  assert.deepEqual(filtered.map((item) => item.name), [
    "Matka Chicken Nawabi Biryani",
    "Matka Chicken Chilman Biryani",
    "Matka Chicken Sindhi Biryani",
    "Chicken Tikka Biryani (2 Person)",
  ]);
  assert.equal(filterMenu(menu, "  BURGER ").length, 4);
  assert.equal(filterMenu(menu, "", "Drinks").length, 5);
});

test("uses a distinct local original photo for every menu dish", async () => {
  const photographed = (await loadFrom(sourceCsv)).filter((item) => item.imageUrl);
  assert.equal(photographed.length, 56);
  assert.equal(new Set(photographed.map((item) => item.imageUrl)).size, photographed.length);
  for (const item of photographed) {
    assert.match(item.imageUrl, /^\/assets\/dishes\/[\w-]+\.(?:jpg|png)$/);
    await readFile(new URL(item.imageUrl.slice(1), new URL("../public/", import.meta.url)));
  }
});

test("loads the menu from the public Google Sheets CSV export", async () => {
  let requestedUrl = "";
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return { ok: true, status: 200, text: async () => sourceCsv };
  };
  assert.equal((await loadMenu()).length, 56);
  assert.equal(
    requestedUrl,
    "https://docs.google.com/spreadsheets/d/12HlnhsxmfweQcu_OLjgiKPHq_z4mK_7gGESXK2FxcE0/export?format=csv",
  );
});

test("handles a CSV byte marker and quoted commas", async () => {
  const menu = await loadFrom('\uFEFFItem Name,Category,Price,Image URL,Description,Status\n"Dish, special",Rice,50,, "Soft, warm rice",Available');
  assert.equal(menu[0].name, "Dish, special");
  assert.equal(menu[0].description, "Soft, warm rice");
});

test("rejects incomplete menu columns and invalid prices", async () => {
  await assert.rejects(loadFrom("Name,Price\nDish,5"), /missing required columns/);
  await assert.rejects(
    loadFrom("Item Name,Category,Price,Image URL,Description,Status\nDish,Rice,unknown,,Description,Available"),
    /invalid name or price/,
  );
});

test("escapes menu text and formats PKR", () => {
  assert.equal(escapeHtml(`<dish "special">`), "&lt;dish &quot;special&quot;&gt;");
  assert.match(formatPrice(390), /390/);
  assert.match(formatPrice(390), /PKR/);
});

test("restores only cart entries that refer to current menu items", () => {
  const menu = [{ slug: "dish", price: 50 }];
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
  };
  saveCart([{ slug: "dish", quantity: 2, note: "Warm" }, { slug: "removed", quantity: 1 }]);
  const restored = readCart(menu);
  assert.equal(restored.error, null);
  assert.deepEqual(restored.items, [{ slug: "dish", quantity: 2, note: "Warm" }]);
  assert.equal(cartSubtotal(restored.items, menu), 100);
  delete globalThis.localStorage;
});

test("builds a WhatsApp handoff for the restaurant recipient", () => {
  let destination = "";
  globalThis.window = { location: { assign: (url) => { destination = url; } } };
  openWhatsApp("Test order: burger × 2");
  assert.equal(new URL(destination).hostname, "wa.me");
  assert.equal(new URL(destination).pathname, "/923481591949");
  assert.equal(new URL(destination).searchParams.get("text"), "Test order: burger × 2");
  delete globalThis.window;
});
