export type Locale = (typeof locales)[number];

export const locales = ['en-US', 'fr-FR', 'de-DE', 'it-IT', 'pl-PL', 'pt-PT', 'tr-TR'] as const;
export const defaultLocale: Locale = 'en-US';