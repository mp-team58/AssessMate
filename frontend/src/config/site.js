// Single place for site-wide details used by the landing page and footer.
// Fill in contactEmail / contactPhone and they will automatically appear
// in the footer as clickable mailto: / tel: links. Leave them empty to hide.
export const SITE = {
  name: 'AssessMate',
  contactEmail: 'mail.assessmate@gmail.com',
  contactPhone: '',
};

// Turns "+91 98765 43210" into "+919876543210" for tel: links.
export const toTelHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;
