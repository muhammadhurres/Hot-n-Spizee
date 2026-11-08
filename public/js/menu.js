const REQUIRED_COLUMNS = ["Item Name", "Category", "Price", "Image URL", "Description", "Status"];
const MENU_CSV_URL = "https://docs.google.com/spreadsheets/d/12HlnhsxmfweQcu_OLjgiKPHq_z4mK_7gGESXK2FxcE0/export?format=csv";
const LOCAL_DISH_IMAGES = {
  "Bar B.Q Malai Burger": "bar-b-q-malai-burger.jpg",
  "Regular Plater 4 Person": "regular-plater-4-person.jpg",
  "Beef Seekh Kabab 4 Pieces": "beef-seekh-kabab-4-pieces.jpg",
  "Beef Burger": "beef-burger.jpg",
  "Chicken Boti with Bone": "chicken-boti-with-bone.jpg",
  "Chicken Cheese Handi": "chicken-cheese-handi.jpg",
  "Chicken Chowmein": "chicken-chowmein.jpg",
  "Chicken Corn Soup (1 Person)": "chicken-corn-soup-1-person.jpg",
  "Chicken Fried Rice": "chicken-fried-rice.jpg",
  "Chicken Makhni Handi": "chicken-makhni-handi.jpg",
  "Chicken Makhni Karahi (Half)": "chicken-makhni-karahi-half.jpg",
  "Chicken Makhni Karahi (Full)": "chicken-makhni-karahi-full.jpg",
  "Chicken Handi": "chicken-handi.jpg",
  "Chicken Manchurian with Rice": "chicken-manchurian-with-rice.jpg",
  "Chicken Malai Boti Boneless": "chicken-malai-boti-boneless.jpg",
  "Chicken Boti Boneless": "chicken-boti-boneless.jpg",
  "Chicken Reshmi Kabab (4 Pieces)": "chicken-reshmi-kabab-4-pieces.jpg",
  "Chicken Reshmi Kabab (12 Pieces)": "chicken-reshmi-kabab-12-pieces.jpg",
  "Chicken Tikka Leg": "chicken-tikka-leg.jpg",
  "Malai Tikka": "malai-tikka.jpg",
  "Chicken Cheese Kabab (4 P)": "chicken-cheese-kabab-4-p.jpg",
  "Shangrila Boti Plate": "shangrila-boti-plate.jpg",
  "Chicken Tikka Biryani (2 Person)": "chicken-tikka-biryani-2-person.jpg",
  "Chicken Tikka Chest": "chicken-tikka-chest.jpg",
  "Chicken White Handi": "chicken-white-handi.jpg",
  "Chicken White Karahi (Half)": "chicken-white-karahi-half.jpg",
  "Chicken White Karahi (Full)": "chicken-white-karahi-full.jpg",
  "Cold Drink 1.5Lt": "cold-drink-1-5lt.jpg",
  "Cold Drink 500ml": "cold-drink-500ml.jpg",
  "Cold Drink Can": "cold-drink-can.jpg",
  "Crispy Zinger Burger": "crispy-zinger-burger.jpg",
  "Daal Makhni Handi": "daal-makhni-handi.jpg",
  "Egg Fried Rice": "egg-fried-rice.jpg",
  "Fried Chicken Psc with Fries": "fried-chicken-psc-with-fries.jpg",
  "Hot & Sour Soup with Chicken (1 Person)": "hot-sour-soup-with-chicken-1-person.jpg",
  "Hot & Sour Soup with Chicken (Family)": "hot-sour-soup-with-chicken-family.jpg",
  "Loaded Fries": "loaded-fries.jpg",
  "Matka Chicken Nawabi Biryani": "matka-chicken-nawabi-biryani.jpg",
  "Matka Chicken Chilman Biryani": "matka-chicken-chilman-biryani.jpg",
  "Matka Chicken Sindhi Biryani": "matka-chicken-sindhi-biryani.jpg",
  "Mineral Water (L)": "mineral-water-l.jpg",
  "Mineral Water (S)": "mineral-water-s.jpg",
  "Mayo Fries": "mayo-fries.jpg",
  "Paratha": "paratha.jpg",
  "Plain Naan": "plain-naan.jpg",
  "Roti": "roti.jpg",
  "Masala Fries": "masala-fries.jpg",
  "Regular Plater 2 Person": "regular-plater-2-person.jpg",
  "Chicken Corn Soup (Family)": "chicken-corn-soup-family.jpg",
  "Single Fries": "single-fries.png",
  "Thai Soup (Family)": "thai-soup-family.jpg",
  "Thai Soup (1 Person)": "thai-soup-1-person.jpg",
  "Vegetable Chowmein": "vegetable-chowmein.jpg",
  "Vegetable Fried Rice": "vegetable-fried-rice.jpg",
  "White Rice": "white-rice.jpg",
  "Zinger with Cheese Burger": "zinger-with-cheese-burger.jpg",
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (value || row.length) {
    row.push(value);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }
  return rows;
}

function toSlug(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function loadMenu() {
  const response = await fetch(MENU_CSV_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Menu could not be loaded (HTTP ${response.status}).`);

  const rows = parseCsv(await response.text());
  if (!rows.length) throw new Error("The menu file is empty.");
  const headers = rows[0].map((header) => header.trim().replace(/^\uFEFF/, ""));
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`Menu file is missing required columns: ${missing.join(", ")}.`);

  const positions = Object.fromEntries(REQUIRED_COLUMNS.map((column) => [column, headers.indexOf(column)]));
  const slugCounts = new Map();
  return rows.slice(1).map((cells, index) => {
    const name = (cells[positions["Item Name"]] || "").trim();
    const price = Number((cells[positions.Price] || "").trim());
    if (!name || !Number.isFinite(price) || price < 0) {
      throw new Error(`Menu row ${index + 2} has an invalid name or price.`);
    }
    const baseSlug = toSlug(name) || `dish-${index + 1}`;
    const count = (slugCounts.get(baseSlug) || 0) + 1;
    slugCounts.set(baseSlug, count);
    return {
      slug: count === 1 ? baseSlug : `${baseSlug}-${count}`,
      name,
      category: (cells[positions.Category] || "").trim() || "Menu",
      price,
      imageUrl: LOCAL_DISH_IMAGES[name]
        ? `/assets/dishes/${LOCAL_DISH_IMAGES[name]}`
        : "",
      description: (cells[positions.Description] || "").trim(),
      available: (cells[positions.Status] || "").trim().toLowerCase() === "available",
    };
  });
}

export function filterMenu(items, query = "", category = "") {
  const search = query.trim().toLowerCase();
  return items.filter((item) => (!category || item.category === category)
    && (!search || `${item.name} ${item.description}`.toLowerCase().includes(search)));
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function formatPrice(value) {
  return `PKR ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(value)}`;
}
