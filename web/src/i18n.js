import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: {
          welcome: 'Welcome to Nexus Platform',
          login: 'Login',
          logout: 'Logout',
          profile: 'Profile',
        },
      },
      es: {
        translation: {
          welcome: 'Bienvenido a Nexus Platform',
          login: 'Iniciar Sesión',
          logout: 'Cerrar Sesión',
          profile: 'Perfil',
        },
      },
    },
  });

export default i18n;
