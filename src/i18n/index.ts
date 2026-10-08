import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import pt from './pt';

export type AppLanguage = 'es' | 'en' | 'pt';
export const supportedLanguages: AppLanguage[] = ['es', 'en', 'pt'];

/**
 * El texto en español es la clave: `t('Tus viajes')` devuelve el mismo texto en español
 * y, para inglés y portugués, la traducción de `en.ts` / `pt.ts`.
 * Si falta una traducción se muestra el español.
 */
export function deviceLanguage(): AppLanguage {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2).toLowerCase();
    return (supportedLanguages as string[]).includes(locale) ? (locale as AppLanguage) : 'es';
  } catch {
    return 'es';
  }
}

// eslint-disable-next-line import/no-named-as-default-member
void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: {} },
    en: { translation: en },
    pt: { translation: pt },
  },
  lng: deviceLanguage(),
  fallbackLng: 'es',
  keySeparator: false,
  nsSeparator: false,
  returnNull: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
