// The message staff send with a set's link, on WhatsApp or by email.
export const selectionMessage = (firstName: string, url: string) =>
  `Hi ${firstName}, here are the pieces from Christina Jewellers you asked to see. ` +
  `Tap to choose your favourites: ${url}`;

// Click-to-chat link: opens WhatsApp with the message ready; staff press send themselves.
// Used as-is for job card read-backs (see readBackMessage).
export const buildReadBackLink = (phoneE164: string, message: string) =>
  `https://wa.me/${phoneE164.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;

export const buildWhatsAppLink = (phoneE164: string, url: string, firstName: string) =>
  buildReadBackLink(phoneE164, selectionMessage(firstName, url));
