import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml, formatPrice, loadMenu } from "../public/js/menu.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(projectRoot, "public");
const outputRoot = path.join(projectRoot, "dist");
const configuredSiteUrl = process.env.SITE_URL;

if (process.env.CF_PAGES && !configuredSiteUrl) {
  throw new Error("Set SITE_URL to the production website origin in Cloudflare Pages build settings.");
}

let siteUrl = "";
if (configuredSiteUrl) {
  const parsed = new URL(configuredSiteUrl);
  if (parsed.protocol !== "https:" || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("SITE_URL must be an HTTPS origin, for example https://www.example.com");
  }
  siteUrl = parsed.origin;
}

const menu = await loadMenu();
const template = await readFile(path.join(sourceRoot, "index.html"), "utf8");
const escapeAttribute = escapeHtml;
const truncate = (text, maxLength = 155) => {
  const value = text.trim();
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trimEnd()}…` : value;
};
const jsonLd = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

function card(item) {
  return `<article class="dish-card">
    <a class="dish-image-wrap${item.imageUrl ? "" : " is-fallback"}" href="/menu/${encodeURIComponent(item.slug)}/" aria-label="View ${escapeAttribute(item.name)}">
      ${item.imageUrl ? `<img class="dish-image" src="${escapeAttribute(item.imageUrl)}" alt="${escapeAttribute(item.name)}" loading="lazy">` : `<div class="dish-image-fallback is-only-fallback">${escapeAttribute(item.category)}</div>`}
    </a>
    <div class="dish-content"><p class="dish-category">${escapeAttribute(item.category)}</p>
      <h2 class="dish-title"><a href="/menu/${encodeURIComponent(item.slug)}/">${escapeAttribute(item.name)}</a></h2>
      <p class="dish-description">${escapeAttribute(item.description)}</p>
      <div class="dish-card-bottom"><span class="price">${formatPrice(item.price)}</span>
        <a class="button button-small" href="/menu/${encodeURIComponent(item.slug)}/">View dish</a>
      </div>
    </div>
  </article>`;
}

function page({ title, description, canonicalPath, main, schema, socialImage = "/assets/logo-hero.jpeg" }) {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeAttribute(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, (_, prefix, suffix) => `${prefix}${escapeAttribute(description)}${suffix}`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, (_, prefix, suffix) => `${prefix}${escapeAttribute(title)}${suffix}`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, (_, prefix, suffix) => `${prefix}${escapeAttribute(description)}${suffix}`)
    .replace(/(<main id="main-content" tabindex="-1">)[\s\S]*?(<\/main>)/, (_, start, end) => `${start}${main}${end}`);

  if (siteUrl) {
    const canonicalUrl = new URL(canonicalPath, siteUrl).href;
    const socialImageUrl = new URL(socialImage, siteUrl).href;
    html = html.replace("</head>", [
      `<meta name="site-url" content="${siteUrl}">`,
      `<link rel="canonical" href="${canonicalUrl}">`,
      `<meta property="og:url" content="${canonicalUrl}">`,
      `<meta property="og:image" content="${socialImageUrl}">`,
      `<meta name="twitter:image" content="${socialImageUrl}">`,
      `<script type="application/ld+json">${jsonLd(schema)}</script>`,
      "</head>",
    ].join("\n    "));
  } else {
    html = html.replace("</head>", `<script type="application/ld+json">${jsonLd(schema)}</script>\n  </head>`);
  }
  return html.replace('<main id="main-content" tabindex="-1">', '<main id="main-content" tabindex="-1" data-prerendered="true">');
}

const address = {
  "@type": "PostalAddress",
  streetAddress: "Street 1, Line 12, Park Rd, near Cheema Hostel, Al Saval Avenue, Chatta Bakhtawar",
  addressLocality: "Islamabad",
  postalCode: "45600",
  addressCountry: "PK",
};
const restaurantSchema = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "Hot n Spizee",
  telephone: "+923481591949",
  address,
  image: siteUrl ? `${siteUrl}/assets/logo-hero.jpeg` : "/assets/logo-hero.jpeg",
  servesCuisine: ["Pakistani", "South Asian"],
  ...(siteUrl ? { url: siteUrl, hasMenu: `${siteUrl}/menu/` } : {}),
};
const homeDescription = "Explore Hot n Spizee's Pakistani menu in Chatta Bakhtawar, Islamabad. View dishes and prices, then send an order request through WhatsApp.";
const homeMain = `<div class="page-shell">
  <section class="hero"><div><p class="eyebrow">Fresh food · Great taste</p>
    <h1>Hot n Spizee Pakistani Restaurant in Islamabad</h1>
    <p class="lead">Explore our menu, view dish details and prices, and send an order request through WhatsApp.</p>
    <div class="hero-actions"><a class="button" href="/menu/">Explore the menu</a></div>
  </div><div class="hero-art"><img src="/assets/logo-hero.jpeg" alt="Hot n Spizee restaurant logo"></div></section>
  <section><div class="section-heading"><h2>Popular dishes</h2><a class="text-link" href="/menu/">View full menu</a></div>
    <div class="menu-grid">${[...new Map(menu.filter((item) => item.available).map((item) => [item.category, item])).values()].slice(0, 6).map(card).join("")}</div>
  </section>
  <section class="notice notice-spaced"><h2>Visit or contact Hot n Spizee</h2>
    <p>Street 1, Line 12, Park Rd, near Cheema Hostel, Al Saval Avenue, Chatta Bakhtawar, Islamabad, 45600</p>
    <p>Open daily · 1:00 PM–1:00 AM</p><p><a href="tel:+923481591949">+92 348 1591949</a></p>
    <p>Orders are requests sent through WhatsApp. The restaurant confirms availability and delivery fees before accepting an order.</p>
  </section>
</div>`;

await rm(outputRoot, { recursive: true, force: true });
await cp(sourceRoot, outputRoot, { recursive: true });
await writeFile(path.join(outputRoot, "index.html"), page({
  title: "Pakistani Restaurant in Islamabad | Hot n Spizee",
  description: homeDescription,
  canonicalPath: "/",
  main: homeMain,
  schema: restaurantSchema,
}));

const menuDirectory = path.join(outputRoot, "menu");
await mkdir(menuDirectory, { recursive: true });
const menuItems = menu.map((item, index) => ({
  "@type": "ListItem",
  position: index + 1,
  url: siteUrl ? `${siteUrl}/menu/${encodeURIComponent(item.slug)}/` : `/menu/${encodeURIComponent(item.slug)}/`,
  name: item.name,
}));
const menuSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Hot n Spizee Menu and Prices",
  ...(siteUrl ? { url: `${siteUrl}/menu/` } : {}),
  mainEntity: { "@type": "ItemList", numberOfItems: menuItems.length, itemListElement: menuItems },
};
const menuDescription = "Browse the Hot n Spizee menu in Islamabad. Explore dishes, descriptions, and prices, then send an order request through WhatsApp.";
const menuMain = `<div class="page-shell"><p class="eyebrow">Hot n Spizee</p><h1>Our menu</h1>
  <p class="lead">Explore dishes, descriptions, and prices. Select a dish for its details and ordering options.</p>
  <div class="menu-grid">${menu.map(card).join("")}</div></div>`;
await writeFile(path.join(menuDirectory, "index.html"), page({
  title: "Menu and Prices | Hot n Spizee Islamabad",
  description: menuDescription,
  canonicalPath: "/menu/",
  main: menuMain,
  schema: menuSchema,
}));

for (const item of menu) {
  const canonicalPath = `/menu/${encodeURIComponent(item.slug)}/`;
  const description = truncate(`${item.description} View the ${item.name} price and menu details at Hot n Spizee in Islamabad.`);
  const image = item.imageUrl ? `${siteUrl}${item.imageUrl}` : undefined;
  const schema = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name: item.name,
    description: item.description,
    ...(image ? { image } : {}),
    offers: {
      "@type": "Offer",
      price: item.price,
      priceCurrency: "PKR",
      availability: item.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      ...(siteUrl ? { url: `${siteUrl}${canonicalPath}` } : {}),
    },
  };
  const main = `<div class="page-shell">
    <p class="eyebrow"><a class="text-link" href="/menu/">${escapeAttribute(item.category)} · Hot n Spizee menu</a></p>
    <section class="detail-layout">
      <div class="dish-image-wrap${item.imageUrl ? "" : " is-fallback"}">
        ${item.imageUrl ? `<img class="detail-image" src="${escapeAttribute(item.imageUrl)}" alt="${escapeAttribute(item.name)}">` : `<div class="dish-image-fallback is-only-fallback">${escapeAttribute(item.category)}</div>`}
      </div>
      <div class="detail-panel"><p class="eyebrow">Made fresh at Hot n Spizee</p><h1>${escapeAttribute(item.name)}</h1>
        <p class="lead">${escapeAttribute(item.description)}</p><p class="detail-price">${formatPrice(item.price)}</p>
        ${item.available ? `<p>Currently listed as available. Add it to your cart to send an order request through WhatsApp.</p>` : `<p class="unavailable">This dish is currently unavailable. Please check again later.</p>`}
        <div class="form-actions"><a class="button" href="/menu/">Explore menu and order</a></div>
      </div>
    </section>
  </div>`;
  const dishDirectory = path.join(menuDirectory, item.slug);
  await mkdir(dishDirectory, { recursive: true });
  await writeFile(path.join(dishDirectory, "index.html"), page({
    title: `${item.name} | Hot n Spizee, Islamabad`,
    description,
    canonicalPath,
    main,
    schema,
    socialImage: item.imageUrl || "/assets/logo-hero.jpeg",
  }));
}

const urls = ["/", "/menu/", ...menu.map((item) => `/menu/${encodeURIComponent(item.slug)}/`)];
await writeFile(path.join(outputRoot, "robots.txt"), [
  "User-agent: *",
  "Allow: /",
  ...(siteUrl ? [`Sitemap: ${siteUrl}/sitemap.xml`] : []),
  "",
].join("\n"));
if (siteUrl) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${siteUrl}${url}</loc></url>`).join("\n")}\n</urlset>\n`;
  await writeFile(path.join(outputRoot, "sitemap.xml"), sitemap);
}

console.log(`Built ${menu.length} dish pages and a menu page in dist/.`);
console.log(siteUrl ? `Canonical URLs and sitemap use ${siteUrl}.` : "SITE_URL not set; configure it to generate canonical URLs and sitemap.xml.");
