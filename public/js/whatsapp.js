// Restaurant WhatsApp number confirmed by the owner.
const RESTAURANT_WHATSAPP = "923481591949";

export function openWhatsApp(message) {
  const url = `https://wa.me/${RESTAURANT_WHATSAPP}?text=${encodeURIComponent(message)}`;
  window.location.assign(url);
}
