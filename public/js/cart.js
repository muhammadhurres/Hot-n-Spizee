const STORAGE_KEY = "hot-n-spizee-cart-v1";

export function readCart(menu) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) throw new Error("Saved cart data is not a list.");
    const knownItems = new Set(menu.map((item) => item.slug));
    const items = stored.filter((entry) => knownItems.has(entry.slug)
      && Number.isInteger(entry.quantity) && entry.quantity > 0)
      .map((entry) => ({ slug: entry.slug, quantity: entry.quantity, note: String(entry.note || "").slice(0, 500) }));
    return { items, error: null };
  } catch (error) {
    return { items: [], error };
  }
}

export function saveCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function cartSubtotal(items, menu) {
  const bySlug = new Map(menu.map((item) => [item.slug, item]));
  return items.reduce((total, entry) => total + (bySlug.get(entry.slug)?.price || 0) * entry.quantity, 0);
}
