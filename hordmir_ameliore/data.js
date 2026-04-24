// Données catalogue — prêtes à être remplacées par un fetch CSV Google Sheets.
// Format : { brand, name, gender, family, size, reference, stock, isNew }

const FAMILIES = ["Boisé", "Floral", "Oriental", "Hespéridé", "Chypré", "Fougère", "Gourmand"];
const SIZES = ["50ml", "100ml", "75ml", "125ml"];
const STOCKS = ["En stock", "En stock", "En stock", "Stock limité", "Sur commande"];

const SEEDS = [
  ["Dior", "Sauvage Elixir", "Homme"],
  ["Chanel", "N°5 Eau de Parfum", "Femme"],
  ["Tom Ford", "Oud Wood", "Mixte"],
  ["Yves Saint Laurent", "Libre Intense", "Femme"],
  ["Creed", "Aventus", "Homme"],
  ["Maison Francis Kurkdjian", "Baccarat Rouge 540", "Mixte"],
  ["Guerlain", "Shalimar", "Femme"],
  ["Hermès", "Terre d'Hermès", "Homme"],
  ["Jean Paul Gaultier", "Le Mâle Elixir", "Homme"],
  ["Lancôme", "La Vie Est Belle", "Femme"],
  ["Givenchy", "Gentleman Society", "Homme"],
  ["Versace", "Eros Parfum", "Homme"],
  ["Mugler", "Alien Goddess", "Femme"],
  ["Paco Rabanne", "1 Million Elixir", "Homme"],
  ["Carolina Herrera", "Good Girl Suprême", "Femme"],
  ["Armani", "Acqua di Giò Profondo", "Homme"],
  ["Bvlgari", "Le Gemme Tygar", "Mixte"],
  ["Prada", "Paradoxe Intense", "Femme"],
  ["Dolce & Gabbana", "The One Mysterious Night", "Homme"],
  ["Burberry", "Her Elixir de Parfum", "Femme"],
  ["Issey Miyake", "L'Eau d'Issey Pour Homme", "Homme"],
  ["Kenzo", "Flower by Kenzo", "Femme"],
  ["Diptyque", "Philosykos", "Mixte"],
  ["Byredo", "Gypsy Water", "Mixte"],
  ["Le Labo", "Santal 33", "Mixte"],
  ["Maison Margiela", "Replica Beach Walk", "Mixte"],
  ["Penhaligon's", "Halfeti", "Mixte"],
  ["Amouage", "Reflection 45", "Mixte"],
  ["Xerjoff", "Naxos", "Homme"],
  ["Roja Parfums", "Elysium", "Homme"],
  ["Initio", "Oud for Greatness", "Mixte"],
  ["Parfums de Marly", "Layton Exclusif", "Homme"],
  ["Nishane", "Hacivat", "Mixte"],
  ["Mancera", "Cedrat Boise", "Mixte"],
  ["Montale", "Intense Cafe", "Mixte"],
  ["Memo Paris", "Marfa", "Mixte"],
  ["Frederic Malle", "Portrait of a Lady", "Femme"],
  ["Serge Lutens", "Ambre Sultan", "Mixte"],
  ["L'Artisan Parfumeur", "Mûre et Musc", "Femme"],
  ["Atelier Cologne", "Orange Sanguine", "Mixte"],
  ["Cartier", "La Panthère", "Femme"],
  ["Boucheron", "Quatre", "Femme"],
  ["Van Cleef & Arpels", "Collection Extraordinaire", "Mixte"],
  ["Tiffany & Co", "Rose Gold", "Femme"],
  ["Jimmy Choo", "I Want Choo", "Femme"],
  ["Valentino", "Born In Roma Donna", "Femme"],
  ["Gucci", "Bloom Profumo", "Femme"],
  ["Calvin Klein", "Eternity Aromatic Essence", "Homme"],
  ["Hugo Boss", "Bottled Elixir", "Homme"],
  ["Ralph Lauren", "Polo Blue Parfum", "Homme"],
];

const PERFUMES = Array.from({ length: 360 }, (_, i) => {
  const seed = SEEDS[i % SEEDS.length];
  const variant = Math.floor(i / SEEDS.length);
  return {
    id: `P${String(i + 1).padStart(4, "0")}`,
    brand: seed[0],
    name: variant > 0 ? `${seed[1]} — Édition ${variant}` : seed[1],
    gender: seed[2],
    family: FAMILIES[(i * 3) % FAMILIES.length],
    size: SIZES[variant % SIZES.length],
    reference: `REF-${1000 + i}`,
    stock: STOCKS[i % STOCKS.length],
    isNew: i < 6,
  };
});

const NEW_ARRIVALS = PERFUMES.filter((p) => p.isNew).slice(0, 6);
const ALL_BRANDS = [...new Set(PERFUMES.map((p) => p.brand))].sort();
const ALL_FAMILIES = [...new Set(PERFUMES.map((p) => p.family))].sort();

// ----- WhatsApp -----
const WHATSAPP_NUMBER = "33600000000"; // remplacer par le vrai numéro
const waLink = (msg) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
const waDefault = "Bonjour, je souhaite recevoir des informations sur votre catalogue de parfums.";
const waProduct = (b, n, r) =>
  `Bonjour, je suis intéressé(e) par : ${b} — ${n} (${r}). Pouvez-vous me communiquer le prix et la disponibilité ?`;
