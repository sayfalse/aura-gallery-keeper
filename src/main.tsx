import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Apply saved language preference on startup
const savedLang = localStorage.getItem("app_language") || "en";
document.documentElement.lang = savedLang;
const rtlLangs = ["ar", "he", "ur", "fa"];
document.documentElement.dir = rtlLangs.includes(savedLang) ? "rtl" : "ltr";

createRoot(document.getElementById("root")!).render(<App />);
