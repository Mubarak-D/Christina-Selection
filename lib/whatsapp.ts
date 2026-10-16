// Click-to-chat link: opens WhatsApp with the message ready; staff press send themselves.
export function buildWhatsAppLink(phoneE164: string, url: string, firstName: string): string {
  const text =
    `Hi ${firstName}, here are the pieces from Christina Jewellers you asked to see. ` +
    `Tap to choose your favourites: ${url}`;
  return `https://wa.me/${phoneE164.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
