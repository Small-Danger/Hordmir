// Catalogue : rempli au chargement par script.js via la Netlify Function `products`.
// Feuille publiée CSV par défaut (surcharge possible : window.SHEET_CSV_URL avant script.js).
const DEFAULT_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT3N4JbW7ANWtUFO-pmcSpQPUrdPQwpqoW3Ks9KF79rALJZNvF1biTkf34Rx9CUU3bTAOZID6B0-S02/pub?output=csv";

/** @type {Array<{id:string,brand:string,name:string,gender:string,family:string,size:string,reference:string,stock:string,isNew:boolean}>} */
var PERFUMES = [];
/** @type {typeof PERFUMES} */
var NEW_ARRIVALS = [];

// ----- TikTok (lien profil ou vidéo) -----
const TIKTOK_PROFILE_URL = "https://www.tiktok.com/@hordmir"; // remplacer par le vrai @

// ----- WhatsApp -----
const WHATSAPP_NUMBER = "212674744700"; // +212 674 744 700 (format international sans + pour wa.me)
const waLink = (msg) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
const waDefault = "Bonjour, je souhaite recevoir des informations sur votre catalogue de parfums.";
const waProduct = (b, n, r) =>
  `Bonjour, je suis intéressé(e) par : ${b} — ${n} (${r}). Pouvez-vous me communiquer le prix et la disponibilité ?`;
