export type Locale = (typeof locales)[number];

export const locales = ['en-US', 'de-DE'] as const;
export const defaultLocale: Locale = 'en-US';