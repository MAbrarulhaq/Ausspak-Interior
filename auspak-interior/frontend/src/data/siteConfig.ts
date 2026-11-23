/**
 * Central place for company contact details.
 * Replace the placeholder values below once the real numbers are available.
 * Nothing else in the code base hardcodes a phone number or WhatsApp number.
 */
export const siteConfig = {
  companyName: 'AUSPAK INTERIOR',
  address: 'Main Service Road, Golra Road, opposite G-11/1, Street #1, Islamabad, Pakistan',
  facebookUrl: 'https://www.facebook.com/share/1coqzjSSu7/?mibextid=wwXIfr',

  // Phone numbers. Leave `tel` empty until the real number is known; the UI then shows the placeholder text.
  phones: [
    { label: 'Office', display: '03003822377', tel: '' },
    { label: 'Office', display: '03325281117', tel: '' },
    { label: 'Email', display: 'arrianhbk@gmail.com', tel: '' },
  ],

  // WhatsApp number in international format without "+" or spaces (example: 923001234567).
  // While empty, the WhatsApp button opens WhatsApp with a ready-made message so you can pick a contact.
  whatsappNumber: '923003822377',
  whatsappPlaceholderLabel: '[923003822377]',
  whatsappMessage: 'Hello Auspak Interior, I would like to discuss an interior project.',
} as const;

export const hasRealPhone = (tel: string) => tel.trim().length > 0;

export function whatsappUrl(message: string = siteConfig.whatsappMessage): string {
  const text = encodeURIComponent(message);
  return siteConfig.whatsappNumber
    ? `https://wa.me/${siteConfig.whatsappNumber}?text=${text}`
    : `https://wa.me/?text=${text}`;
}

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteConfig.address)}`;
