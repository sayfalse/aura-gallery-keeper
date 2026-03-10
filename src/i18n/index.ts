import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";
import hi from "./locales/hi.json";
import zh from "./locales/zh.json";
import bn from "./locales/bn.json";
import ru from "./locales/ru.json";
import it from "./locales/it.json";
import pt from "./locales/pt.json";
import de from "./locales/de.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";

const savedLang = localStorage.getItem("app_language") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    ar: { translation: ar },
    hi: { translation: hi },
    zh: { translation: zh },
    bn: { translation: bn },
    ru: { translation: ru },
    it: { translation: it },
    pt: { translation: pt },
    de: { translation: de },
    ja: { translation: ja },
    ko: { translation: ko },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
