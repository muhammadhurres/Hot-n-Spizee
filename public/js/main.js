import { cartSubtotal, readCart, saveCart } from "./cart.js";
import { escapeHtml, filterMenu, formatPrice, loadMenu } from "./menu.js";
import { openWhatsApp } from "./whatsapp.js";

const app = document.querySelector("#main-content");
const cartCount = document.querySelector("#cart-count");
const statusMessage = document.querySelector("#status-message");
const checkout = { name: "", phone: "", fulfillment: "delivery", address: "", payment: "Cash on delivery", locationUrl: "" };
let menu = [];
let cart = [];
let searchValue = "";
let toastTimer;

function notify(message) {
  statusMessage.textContent = message;
  statusMessage.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => statusMessage.classList.remove("is-visible"), 3200);
}

function pathFor(slug) {
  return `/menu/${encodeURIComponent(slug)}/`;
}

function routeUrl() {
  const route = location.hash.startsWith("#/") ? location.hash.slice(1) : location.pathname + location.search;
  return new URL(route, location.origin);
}

function updateCartCount() {
  cartCount.textContent = String(cart.reduce((sum, item) => sum + item.quantity, 0));
}

function addToCart(item, quantity = 1, note = "") {
  const existing = cart.find((entry) => entry.slug === item.slug && entry.note === note);
  if (existing) existing.quantity += quantity;
  else cart.push({ slug: item.slug, quantity, note });
  saveCart(cart);
  updateCartCount();
  notify(`${item.name} added to your cart.`);
}

function dishCard(item) {
  const image = item.imageUrl
    ? `<img class="dish-image" data-food-image src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" referrerpolicy="no-referrer"><div class="dish-image-fallback" aria-hidden="true">${escapeHtml(item.category)}</div>`
    : `<div class="dish-image-fallback is-only-fallback">${escapeHtml(item.category)}</div>`;
  return `<article class="dish-card">
    <a class="dish-image-wrap${item.imageUrl ? "" : " is-fallback"}" href="${pathFor(item.slug)}" data-link aria-label="View ${escapeHtml(item.name)}">
      ${image}
    </a>
    <div class="dish-content">
      <p class="dish-category">${escapeHtml(item.category)}</p>
      <h3 class="dish-title"><a href="${pathFor(item.slug)}" data-link>${escapeHtml(item.name)}</a></h3>
      <p class="dish-description">${escapeHtml(item.description)}</p>
      <div class="dish-card-bottom"><span class="price">${formatPrice(item.price)}</span>
        ${item.available
          ? `<button class="button button-small" type="button" data-add-to-cart="${escapeHtml(item.slug)}" aria-label="Add ${escapeHtml(item.name)} to cart">Add to cart</button>`
          : `<span class="unavailable">Currently unavailable</span>`}
      </div>
    </div>
  </article>`;
}

function categories() {
  return [...new Set(menu.map((item) => item.category))].sort((a, b) => a.localeCompare(b));
}

function menuRoute(category = "", query = "") {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (query.trim()) params.set("q", query.trim());
  const search = params.toString();
  return `/menu/${search ? `?${search}` : ""}`;
}

function updatePageMetadata(title, description, imagePath = "/assets/logo-hero.jpeg") {
  document.title = title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  const siteUrl = document.querySelector('meta[name="site-url"]')?.content;
  const socialImage = new URL(imagePath, siteUrl || location.origin).href;
  document.querySelector('meta[property="og:image"]')?.setAttribute("content", socialImage);
  document.querySelector('meta[name="twitter:image"]')?.setAttribute("content", socialImage);
  const canonical = document.querySelector('link[rel="canonical"]');
  if (siteUrl && canonical) {
    let path = location.hash.startsWith("#/") ? "/" : location.pathname;
    if (path === "/menu") path = "/menu/";
    else if (path.startsWith("/menu/") && !path.endsWith("/")) path += "/";
    canonical.href = new URL(path, siteUrl).href;
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", canonical.href);
  }
}

function categoryLinks(selected = "", query = "") {
  return `<div class="category-list" aria-label="Menu categories">
    <a class="category-chip" href="${menuRoute("", query)}" data-link${selected ? "" : ' aria-current="true"'}>All dishes</a>
    ${categories().map((category) => `<a class="category-chip" href="${menuRoute(category, query)}" data-link${category === selected ? ' aria-current="true"' : ""}>${escapeHtml(category)}</a>`).join("")}
  </div>`;
}

function renderHome() {
  updatePageMetadata(
    "Pakistani Restaurant in Islamabad | Hot n Spizee",
    "Explore Hot n Spizee's Pakistani menu in Chatta Bakhtawar, Islamabad. View dishes and prices, then send an order request through WhatsApp.",
  );
  const featured = [...new Map(menu.filter((item) => item.available)
    .map((item) => [item.category, item])).values()].slice(0, 6);
  app.innerHTML = `<div class="page-shell">
    <section class="hero">
      <div>
        <p class="eyebrow">Fresh food · Great taste</p>
        <h1>Good food, <span>good value.</span></h1>
        <p class="lead">Explore the Hot n Spizee menu, choose what you love, and send your request straight to us on WhatsApp.</p>
        <div class="hero-actions"><a class="button" href="#/menu" data-link>Explore the menu</a><a class="button button-secondary" href="#/reservation" data-link>Reserve a table</a></div>
      </div>
      <div class="hero-art"><img src="/assets/logo-hero.jpeg" alt="Hot n Spizee restaurant logo"></div>
    </section>
    <form class="home-menu-search" id="home-menu-search">
      <label class="search-field"><span class="field-label">Search the menu</span><input id="home-search-query" type="search" maxlength="100" placeholder="Search dishes, like biryani or burger" autocomplete="off"></label>
      <label class="search-field"><span class="field-label">Filter by category</span><select id="home-search-category"><option value="">All categories</option>${categories().map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}</select></label>
      <button class="button" type="submit">Find dishes</button>
    </form>
    <div class="section-heading"><h2>Find your favourite</h2><a class="text-link" href="#/menu" data-link>View full menu</a></div>
    ${categoryLinks()}
    <div class="section-heading"><h2>Popular picks</h2></div>
    <div class="menu-grid">${featured.map(dishCard).join("")}</div>
    <section class="notice notice-spaced"><strong>Ordering note</strong><br>Your WhatsApp message is an order request. Our team confirms availability and the delivery fee with you before accepting it.</section>
  </div>`;
  document.querySelector("#home-menu-search").addEventListener("submit", (event) => {
    event.preventDefault();
    searchValue = document.querySelector("#home-search-query").value.trim();
    history.pushState({}, "", menuRoute(document.querySelector("#home-search-category").value, searchValue));
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.querySelector("#menu-search").focus({ preventScroll: true });
  });
}

function renderMenu() {
  updatePageMetadata(
    "Menu and Prices | Hot n Spizee Islamabad",
    "Browse the Hot n Spizee menu in Islamabad. Explore dishes, descriptions, and prices, then send an order request through WhatsApp.",
  );
  const params = routeUrl().searchParams;
  const selected = params.get("category") || "";
  const query = params.get("q") || "";
  searchValue = query;
  const filtered = filterMenu(menu, query, selected);
  app.innerHTML = `<div class="page-shell">
    <p class="eyebrow">Hot n Spizee</p><h1 id="menu-heading">Our menu</h1>
    <p class="lead">Choose a dish to see its details and add a note for the kitchen.</p>
    ${categoryLinks(selected, query)}
    <div class="menu-tools"><label class="search-field"><span class="field-label">Search dishes</span><input id="menu-search" type="search" maxlength="100" value="${escapeHtml(query)}" placeholder="Try “biryani” or “burger”" autocomplete="off"></label>
      <label class="search-field category-filter"><span class="field-label">Filter by category</span><select id="menu-category-filter" aria-label="Filter menu by category"><option value="">All categories</option>${categories().map((category) => `<option value="${escapeHtml(category)}"${category === selected ? " selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select></label>
      <span class="field-hint">${filtered.length} ${filtered.length === 1 ? "dish" : "dishes"}</span></div>
    ${filtered.length ? `<div class="menu-grid">${filtered.map(dishCard).join("")}</div>` : `<div class="empty-state">No dishes match that search. Try another name or category.</div>`}
  </div>`;
  document.querySelector("#menu-search").addEventListener("input", (event) => {
    searchValue = event.target.value;
    const cursor = event.target.selectionStart;
    history.replaceState({}, "", menuRoute(selected, searchValue));
    renderMenu();
    const input = document.querySelector("#menu-search");
    input.focus();
    input.setSelectionRange(cursor, cursor);
  });
  document.querySelector("#menu-category-filter").addEventListener("change", (event) => {
    history.pushState({}, "", menuRoute(event.target.value, searchValue));
    render();
    document.querySelector("#menu-search").focus({ preventScroll: true });
  });
}

function renderDish(slug) {
  const item = menu.find((entry) => entry.slug === slug);
  if (!item) {
    updatePageMetadata("Dish not found | Hot n Spizee", "This dish could not be found in the Hot n Spizee menu.");
    app.innerHTML = `<div class="page-shell"><div class="empty-state"><h1>Dish not found</h1><a class="text-link" href="#/menu" data-link>Return to the menu</a></div></div>`;
    return;
  }
  app.innerHTML = `<div class="page-shell">
    <p class="eyebrow"><a class="text-link" href="#/menu?category=${encodeURIComponent(item.category)}" data-link>${escapeHtml(item.category)}</a></p>
    <section class="detail-layout">
      <div class="dish-image-wrap${item.imageUrl ? "" : " is-fallback"}">
        ${item.imageUrl ? `<img class="detail-image" data-food-image src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" referrerpolicy="no-referrer">` : ""}
        <div class="dish-image-fallback" aria-hidden="true">${escapeHtml(item.category)}</div>
      </div>
      <div class="detail-panel">
        <p class="eyebrow">Made fresh at Hot n Spizee</p><h1>${escapeHtml(item.name)}</h1>
        <p class="lead">${escapeHtml(item.description)}</p>
        <p class="detail-price">${formatPrice(item.price)}</p>
        ${item.available ? `<form id="dish-form">
          <div class="field"><label for="dish-note">Note for this dish <span class="field-hint">Optional. Add preferences in your own words.</span></label><textarea id="dish-note" maxlength="500" placeholder="For example: less spicy, please"></textarea></div>
          <div class="form-actions"><label class="field"><span class="field-label">Quantity</span><input id="dish-quantity" type="number" min="1" step="1" value="1" required></label><button class="button" type="submit">Add to cart</button></div>
        </form>` : `<p class="unavailable">This dish is currently unavailable. Please check again later.</p>`}
      </div>
    </section>
  </div>`;
  updatePageMetadata(
    `${item.name} | Hot n Spizee, Islamabad`,
    `${item.description} View the ${item.name} price and menu details at Hot n Spizee in Islamabad.`,
    item.imageUrl || "/assets/logo-hero.jpeg",
  );
  const form = document.querySelector("#dish-form");
  if (form) form.addEventListener("submit", (event) => {
    event.preventDefault();
    const quantity = Number(document.querySelector("#dish-quantity").value);
    if (!Number.isSafeInteger(quantity) || quantity < 1) return notify("Enter a whole-number quantity greater than zero.");
    const note = document.querySelector("#dish-note").value.trim();
    addToCart(item, quantity, note);
  });
}

function checkoutFields() {
  const paymentOptions = checkout.fulfillment === "delivery"
    ? ["Cash on delivery", "Bank transfer (advance)", "JazzCash (advance)", "Easypaisa (advance)"]
    : ["Cash at pickup", "Bank transfer (advance)", "JazzCash (advance)", "Easypaisa (advance)"];
  if (!paymentOptions.includes(checkout.payment)) checkout.payment = paymentOptions[0];
  return `<form id="checkout-form" class="checkout-panel">
    <h2>Your details</h2>
    <div class="form-grid">
      <div class="field"><label for="customer-name">Your name *</label><input id="customer-name" name="name" required maxlength="80" autocomplete="name" value="${escapeHtml(checkout.name)}"></div>
      <div class="field"><label for="customer-phone">Your phone/WhatsApp number *</label><input id="customer-phone" name="phone" required maxlength="25" autocomplete="tel" inputmode="tel" value="${escapeHtml(checkout.phone)}"></div>
      <div class="field field-full"><span class="field-label">How would you like your order?</span><div class="radio-list">
        <label class="radio-option"><input type="radio" name="fulfillment" value="delivery"${checkout.fulfillment === "delivery" ? " checked" : ""}><span><strong>Delivery</strong><small>Staff confirms delivery availability and fee in WhatsApp.</small></span></label>
        <label class="radio-option"><input type="radio" name="fulfillment" value="pickup"${checkout.fulfillment === "pickup" ? " checked" : ""}><span><strong>Pickup</strong><small>Collect from the restaurant after staff confirms your request.</small></span></label>
      </div></div>
      ${checkout.fulfillment === "delivery" ? `<div class="field field-full"><label for="delivery-address">Delivery address *</label><textarea id="delivery-address" name="address" required maxlength="500" autocomplete="street-address" placeholder="House/building, street, area, and a nearby landmark">${escapeHtml(checkout.address)}</textarea><span class="field-hint">You can also share your current location with permission; add a typed address or landmark if possible.</span><button class="button button-secondary button-small location-button" id="location-button" type="button">Use my current location</button>${checkout.locationUrl ? `<span class="field-hint">A map link will be included in your WhatsApp message.</span>` : ""}</div>` : ""}
      <div class="field field-full"><label for="payment-method">Preferred payment method *</label><select id="payment-method" name="payment">
        ${paymentOptions.map((method) => `<option${checkout.payment === method ? " selected" : ""}>${method}</option>`).join("")}
      </select><span class="field-hint">No payment is taken on this website. Staff confirms your order and sends payment details for advance payment.</span></div>
    </div>
    <div class="summary-row"><span>Food subtotal</span><strong>${formatPrice(cartSubtotal(cart, menu))}</strong></div>
    <p class="fine-print">${checkout.fulfillment === "delivery" ? "Delivery fee is not included; staff will confirm it in WhatsApp. " : ""}Sending your request does not confirm the order. Staff checks availability first. Prepaid orders are generally final after confirmation, with staff-reviewed exceptions for unavailable food or an extreme delay.</p>
    <button class="button" type="submit">Continue to WhatsApp</button>
  </form>`;
}

function renderCart() {
  const bySlug = new Map(menu.map((item) => [item.slug, item]));
  const previousCount = cart.length;
  cart = cart.filter((entry) => bySlug.has(entry.slug) && bySlug.get(entry.slug).available);
  if (cart.length !== previousCount) notify("Unavailable or removed dishes were taken out of your cart. Please review your order.");
  saveCart(cart);
  if (!cart.length) {
    app.innerHTML = `<div class="page-shell"><p class="eyebrow">Your order</p><h1>Your cart is empty</h1><p class="lead">Choose something from the menu and it will appear here.</p><a class="button" href="#/menu" data-link>Browse the menu</a></div>`;
    updateCartCount();
    return;
  }
  const lines = cart.map((entry, index) => {
    const item = bySlug.get(entry.slug);
    return `<article class="cart-line">
      <div><h3><a href="${pathFor(item.slug)}" data-link>${escapeHtml(item.name)}</a></h3><p>${formatPrice(item.price)} each · ${formatPrice(item.price * entry.quantity)}</p>
        <label class="field cart-note"><span class="field-label">Note for this dish</span><textarea data-note-index="${index}" maxlength="500" placeholder="Optional">${escapeHtml(entry.note)}</textarea></label>
      </div>
      <div class="cart-line-controls"><label class="field"><span class="field-label">Qty</span><input class="quantity-input" type="number" min="1" step="1" value="${entry.quantity}" data-quantity-index="${index}" aria-label="Quantity of ${escapeHtml(item.name)}"></label><button class="remove-button" type="button" data-remove-index="${index}">Remove</button></div>
    </article>`;
  }).join("");
  app.innerHTML = `<div class="page-shell"><p class="eyebrow">Your order</p><h1>Review your cart</h1>
    <div class="cart-layout"><section class="cart-list"><h2>Your dishes</h2>${lines}
      <a class="text-link" href="#/menu" data-link>+ Add another dish</a></section>
      ${checkoutFields()}
    </div>
  </div>`;
  document.querySelector("#checkout-form").addEventListener("input", (event) => {
    if (event.target.name) checkout[event.target.name] = event.target.value;
  });
  document.querySelector("#checkout-form").addEventListener("change", (event) => {
    if (event.target.name) checkout[event.target.name] = event.target.value;
    if (event.target.name === "fulfillment") renderCart();
  });
  document.querySelector("#checkout-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const entries = cart.map((entry) => {
      const item = bySlug.get(entry.slug);
      return `• ${item.name} × ${entry.quantity} — ${formatPrice(item.price * entry.quantity)}${entry.note ? `\n  Note: ${entry.note}` : ""}`;
    });
    const locationLine = checkout.locationUrl ? `\nMap: ${checkout.locationUrl}` : "";
    const addressLine = checkout.fulfillment === "delivery" ? `\nDelivery address: ${checkout.address.trim()}${locationLine}` : "";
    const message = [
      "ORDER REQUEST — Hot n Spizee",
      `Name: ${checkout.name.trim()}`,
      `Customer phone/WhatsApp: ${checkout.phone.trim()}`,
      `Fulfilment: ${checkout.fulfillment === "delivery" ? "Delivery" : "Pickup"}`,
      ...entries,
      `Food subtotal: ${formatPrice(cartSubtotal(cart, menu))}`,
      checkout.fulfillment === "delivery" ? "Delivery fee: please confirm with me before accepting the order." : "",
      `Preferred payment: ${checkout.payment}`,
      addressLine,
      "Please confirm item availability and the final amount. I understand this request is not confirmed until the restaurant replies.",
    ].filter(Boolean).join("\n");
    openWhatsApp(message);
  });
}

function renderReservation() {
  app.innerHTML = `<div class="page-shell"><p class="eyebrow">A table at Hot n Spizee</p><h1>Request a reservation</h1>
    <div class="reservation-layout">
      <aside class="reservation-aside"><p class="eyebrow">Plan your visit</p><h2>We’ll check the table for you.</h2><p>Send your preferred date, time, and party size. Our team checks availability and confirms the required advance payment directly with you on WhatsApp.</p><p><strong>Open daily</strong><br>1:00 PM–1:00 AM</p></aside>
      <form id="reservation-form" class="form-panel"><h2>Your reservation request</h2>
        <div class="form-grid">
          <div class="field"><label for="reserve-name">Your name *</label><input id="reserve-name" name="name" required maxlength="80" autocomplete="name"></div>
          <div class="field"><label for="reserve-phone">Your phone/WhatsApp number *</label><input id="reserve-phone" name="phone" required maxlength="25" autocomplete="tel" inputmode="tel"></div>
          <div class="field"><label for="reserve-date">Preferred date *</label><input id="reserve-date" name="date" type="date" required></div>
          <div class="field"><label for="reserve-time">Preferred time *</label><input id="reserve-time" name="time" type="time" required><span class="field-hint">Staff will confirm that the requested time is available.</span></div>
          <div class="field"><label for="reserve-party">Number of guests *</label><input id="reserve-party" name="party" type="number" min="1" max="30" required></div>
          <div class="field field-full"><label for="reserve-note">Extra note <span class="field-hint">Optional</span></label><textarea id="reserve-note" name="note" maxlength="500"></textarea></div>
        </div>
        <p class="fine-print">This is a request, not a confirmed booking. Staff will check table availability, calculate the advance based on your party size, and share payment instructions. Your table is confirmed only after staff verifies payment. Reservation deposits are non-refundable once the booking is confirmed.</p>
        <button class="button" type="submit">Continue to WhatsApp</button>
      </form>
    </div>
  </div>`;
  const dateInput = document.querySelector("#reserve-date");
  dateInput.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  document.querySelector("#reservation-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const form = new FormData(event.currentTarget);
    const message = [
      "TABLE RESERVATION REQUEST — Hot n Spizee",
      `Name: ${String(form.get("name")).trim()}`,
      `Customer phone/WhatsApp: ${String(form.get("phone")).trim()}`,
      `Preferred date: ${form.get("date")}`,
      `Preferred time: ${form.get("time")}`,
      `Number of guests: ${form.get("party")}`,
      form.get("note") ? `Note: ${String(form.get("note")).trim()}` : "",
      "Please confirm table availability and tell me the advance amount and payment instructions. I understand this request is not a confirmed booking until the restaurant replies and verifies payment, and that the reservation deposit is non-refundable once confirmed.",
    ].filter(Boolean).join("\n");
    openWhatsApp(message);
  });
}

function renderAdminGate() {
  app.innerHTML = `<div class="page-shell"><p class="eyebrow">Restaurant team</p><h1>Menu management</h1>
    <section class="admin-gate"><strong>Google Sheets is the menu editor.</strong><p>Sign in with the authorized restaurant account to edit the menu. Google controls who can edit; this website does not collect your Google password.</p><p><a class="text-link" href="https://docs.google.com/spreadsheets/d/12HlnhsxmfweQcu_OLjgiKPHq_z4mK_7gGESXK2FxcE0/edit" target="_blank" rel="noopener noreferrer">Open the menu spreadsheet</a></p><p>The public website reads the menu as CSV. Keep private notes and secrets out of the published menu tab. Staff must still confirm each WhatsApp order.</p></section>
  </div>`;
}

function render() {
  updateCartCount();
  const current = routeUrl();
  const path = decodeURIComponent(current.pathname).replace(/\/+$/, "") || "/";
  if (path === "/") renderHome();
  else if (path === "/menu") renderMenu();
  else if (path.startsWith("/menu/")) renderDish(path.slice("/menu/".length));
  else if (path === "/cart") renderCart();
  else if (path === "/reservation") renderReservation();
  else if (path === "/admin") renderAdminGate();
  else if (path.startsWith("/dish/")) renderDish(path.slice("/dish/".length));
  else app.innerHTML = `<div class="page-shell"><h1>Page not found</h1><a class="text-link" href="#/" data-link>Return home</a></div>`;
}

app.addEventListener("error", (event) => {
  const image = event.target.closest?.("[data-food-image]");
  if (image && image.dataset.fallbackApplied !== "true") {
    image.dataset.fallbackApplied = "true";
    image.closest(".dish-image-wrap")?.classList.add("is-fallback");
  }
}, true);

app.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-to-cart]");
  if (addButton) {
    const item = menu.find((entry) => entry.slug === addButton.dataset.addToCart);
    if (item?.available) addToCart(item);
    return;
  }
  const link = event.target.closest("a[data-link]");
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const target = new URL(link.href);
  const targetPath = target.hash.startsWith("#/") ? target.hash.slice(1) : `${target.pathname}${target.search}`;
  history.pushState({}, "", targetPath);
  const targetRoute = new URL(targetPath, location.origin);
  searchValue = targetRoute.pathname === "/menu" ? (targetRoute.searchParams.get("q") || "") : "";
  render();
  document.querySelector("#main-content").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
});

app.addEventListener("click", (event) => {
  if (event.target.closest("#location-button")) {
    if (!navigator.geolocation) return notify("Location sharing is not available in this browser. Type your delivery address instead.");
    const button = event.target.closest("#location-button");
    button.disabled = true;
    button.textContent = "Getting location…";
    navigator.geolocation.getCurrentPosition((position) => {
      checkout.locationUrl = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
      renderCart();
      notify("Location link added. Check your address before continuing.");
    }, (error) => {
      button.disabled = false;
      button.textContent = "Use my current location";
      if (error.code === error.PERMISSION_DENIED) notify("Location permission was denied. You can type your address instead.");
      else if (error.code === error.TIMEOUT) notify("Location took too long to find. Please type your address instead.");
      else notify("Could not get your location. Please type your address instead.");
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  }
});

app.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove-index]");
  if (remove) {
    cart.splice(Number(remove.dataset.removeIndex), 1);
    saveCart(cart);
    renderCart();
    updateCartCount();
  }
});

app.addEventListener("change", (event) => {
  const quantityInput = event.target.closest("[data-quantity-index]");
  if (quantityInput) {
    const index = Number(quantityInput.dataset.quantityIndex);
    const quantity = Number(quantityInput.value);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      quantityInput.value = String(cart[index].quantity);
      return notify("Enter a whole-number quantity greater than zero.");
    }
    cart[index].quantity = quantity;
    saveCart(cart);
    renderCart();
    updateCartCount();
  }
  const noteInput = event.target.closest("[data-note-index]");
  if (noteInput) {
    cart[Number(noteInput.dataset.noteIndex)].note = noteInput.value.trim();
    saveCart(cart);
  }
});

window.addEventListener("popstate", render);

try {
  menu = await loadMenu();
  const saved = readCart(menu);
  cart = saved.items;
  if (saved.error) {
    console.error("Could not restore the saved cart.", saved.error);
    notify("Your previous cart could not be restored; you can start a new one.");
  }
  saveCart(cart);
  render();
} catch (error) {
  console.error("The menu failed to load.", error);
  if (app.dataset.prerendered !== "true") {
    app.innerHTML = `<div class="page-shell"><section class="empty-state"><h1>Menu unavailable</h1><p>We couldn't load the menu just now. Please try again later.</p></section></div>`;
  }
}
