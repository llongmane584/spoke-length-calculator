import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import jaTranslation from './locales/ja.json';

const resources = {
  'en-GB': {
    translation: enTranslation
  },
  ja: {
    translation: jaTranslation
  }
};

// Normalise the saved language. Anything that is not Japanese is English, which
// also absorbs the legacy 'en' left in localStorage by earlier versions —
// without this the language <select> would find no matching <option> and blank out.
const storedLanguage = localStorage.getItem('preferredLanguage');
const savedLanguage = storedLanguage === 'ja' ? 'ja' : 'en-GB';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en-GB',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;