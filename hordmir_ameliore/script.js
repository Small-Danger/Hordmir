// ============= State =============
const state = {
  search: "",
  gender: "all",
  page: 1,
};
const PAGE_SIZE = 25;

/**
 * Produits : GET /.netlify/functions/products?sheetUrl=… (même domaine sous Netlify).
 * Dev local sans fichier ouvert en file:// : lancer `netlify dev`, ou définir
 * window.PRODUCTS_API_BASE (ex. "http://localhost:8888") avant ce script pour pointer vers l’API.
 */
function productsApiUrl() {
  const sheetUrl =
    typeof window.SHEET_CSV_URL === "string" && window.SHEET_CSV_URL.trim()
      ? window.SHEET_CSV_URL.trim()
      : DEFAULT_SHEET_CSV_URL;
  const base =
    typeof window.PRODUCTS_API_BASE === "string" && window.PRODUCTS_API_BASE.trim()
      ? window.PRODUCTS_API_BASE.trim().replace(/\/$/, "")
      : "";
  return `${base}/.netlify/functions/products?sheetUrl=${encodeURIComponent(sheetUrl)}`;
}

function sheetCell(row, ...keys) {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function sheetTruthyNew(val) {
  const s = String(val).trim().toLowerCase();
  return ["1", "true", "oui", "yes", "x", "new", "nouveau", "vrai"].includes(s);
}

/** Colonnes courtes type F / H / U du sheet → libellés du filtre HTML. */
function normalizeGenderLabel(raw) {
  const g = String(raw).trim().toUpperCase();
  if (!g) return "Mixte";
  if (g === "F" || g === "FEMME" || g === "FÉMININ") return "Femme";
  if (g === "H" || g === "M" || g === "HOMME" || g === "MASCULIN") return "Homme";
  if (g === "U" || g === "X" || g === "N" || g === "MIXTE" || g === "UNISEXE") return "Mixte";
  return raw.trim();
}

function normalizeSheetRow(row, index) {
  const brand = sheetCell(row, "marque", "maison", "brand");
  const name = sheetCell(row, "nom", "name", "parfum");
  const reference = sheetCell(row, "reference", "ref", "référence", "réf", "sku");
  const id = sheetCell(row, "id") || reference || `row-${index + 1}`;
  const genderRaw = sheetCell(row, "genre", "gender");
  const gender = normalizeGenderLabel(genderRaw);
  const family = sheetCell(row, "famille", "family", "olfactive");
  const size = sheetCell(row, "cont", "contenance", "taille", "size", "ml");
  const stock = sheetCell(row, "stock", "disponibilite", "disponibilité");
  const isNew = sheetTruthyNew(sheetCell(row, "nouveaute", "nouveauté", "isnew", "new"));
  return {
    id,
    brand,
    name,
    gender: gender || "Mixte",
    family: family || "—",
    size: size || "—",
    reference: reference || id,
    stock: stock || "—",
    isNew,
  };
}

async function loadProductsFromSheet() {
  const countEl = $("#results-count");
  try {
    const res = await fetch(productsApiUrl());
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    if (data.error) throw new Error(data.error);
    const raw = Array.isArray(data.products) ? data.products : [];
    const mapped = raw
      .map((row, i) => normalizeSheetRow(row, i))
      .filter((p) => p.brand || p.name || p.reference);
    PERFUMES = mapped;
    NEW_ARRIVALS = PERFUMES.filter((p) => p.isNew).slice(0, 8);
    if (countEl && PERFUMES.length === 0) {
      countEl.textContent = "Aucune ligne produit (vérifiez les en-têtes du Google Sheet).";
    }
  } catch (e) {
    console.error("loadProductsFromSheet:", e);
    PERFUMES = [];
    NEW_ARRIVALS = [];
    if (countEl) {
      countEl.textContent =
        "Catalogue indisponible. Lancez `netlify dev` ou déployez sur Netlify (voir commentaire en tête de script.js).";
    }
  }
}

// ============= Helpers =============
const $ = (sel) => document.querySelector(sel);
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ============= WhatsApp links =============
function bindWhatsApp() {
  document.querySelectorAll("[data-wa='default']").forEach((a) => {
    a.href = waLink(waDefault);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  });
}

// ============= New Arrivals =============

function renderNewArrivals() {
  const grid = $("#new-arrivals-grid");
  if (!grid) return;

  grid.innerHTML = NEW_ARRIVALS.slice(0, 8).map(p => {
    return `
      <tr>
        <td class="cell-ref">${escapeHtml(p.reference)}</td>
        <td class="cell-brand">${escapeHtml(p.brand)}</td>
        <td class="cell-name">${escapeHtml(p.name)}</td>
        <td class="hide-sm cell-muted">${escapeHtml(p.family)}</td>
        <td class="hide-md cell-muted">${escapeHtml(p.gender)}</td>
        <td class="hide-md cell-muted">${escapeHtml(p.size)}</td>
      </tr>`;
  }).join("");
}

// ============= Filters =============
function getFiltered() {
  const q = state.search.trim().toLowerCase();
  return PERFUMES.filter((p) => {
    if (state.gender !== "all" && p.gender !== state.gender) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.reference.toLowerCase().includes(q)
    );
  });
}

// ============= Catalogue render =============
function renderCatalogue() {
  const filtered = getFiltered();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * PAGE_SIZE;
  const items = filtered.slice(start, start + PAGE_SIZE);

  const count = $("#results-count");
  if (count) {
    const s = filtered.length > 1 ? "s" : "";
    count.textContent = `${filtered.length} parfum${s} trouvé${s}`;
  }

  const tbody = $("#catalogue-body");
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Aucun parfum ne correspond à votre recherche.</td></tr>`;
  } else {
    tbody.innerHTML = items
      .map((p) => {
        return `
        <tr>
          <td class="cell-ref">${escapeHtml(p.reference)}</td>
          <td class="cell-brand">${escapeHtml(p.brand)}</td>
          <td class="cell-name">${escapeHtml(p.name)}</td>
          <td class="cell-muted hide-sm">${escapeHtml(p.family)}</td>
          <td class="cell-muted hide-md">${escapeHtml(p.gender)}</td>
          <td class="cell-muted hide-md">${escapeHtml(p.size)}</td>
        </tr>`;
      })
      .join("");
  }

  // pagination
  const pag = $("#pagination");
  if (totalPages > 1) {
    pag.style.display = "flex";
    $("#page-info").textContent = `Page ${state.page} / ${totalPages}`;
    $("#prev-page").disabled = state.page === 1;
    $("#next-page").disabled = state.page === totalPages;
  } else {
    pag.style.display = "none";
  }
}

// ============= Bindings =============
function bindFilters() {
  $("#filter-search").addEventListener("input", (e) => {
    state.search = e.target.value;
    state.page = 1;
    renderCatalogue();
  });
  $("#filter-gender").addEventListener("change", (e) => {
    state.gender = e.target.value;
    state.page = 1;
    renderCatalogue();
  });
  $("#filter-reset").addEventListener("click", () => {
    state.search = "";
    state.gender = "all";
    state.page = 1;
    $("#filter-search").value = "";
    $("#filter-gender").value = "all";
    renderCatalogue();
  });

  $("#prev-page").addEventListener("click", () => {
    if (state.page > 1) {
      state.page--;
      renderCatalogue();
      document.getElementById("catalogue").scrollIntoView({ behavior: "smooth" });
    }
  });
  $("#next-page").addEventListener("click", () => {
    state.page++;
    renderCatalogue();
    document.getElementById("catalogue").scrollIntoView({ behavior: "smooth" });
  });
}

// ============= Init =============
document.addEventListener("DOMContentLoaded", () => {
  void (async () => {
    bindWhatsApp();
    initMobileMenu();
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    if (document.getElementById("filter-search")) {
      await loadProductsFromSheet();
      renderNewArrivals();
      bindFilters();
      renderCatalogue();
    }
  })();
});

const header = document.querySelector(".header");
if (header) {
  window.addEventListener(
    "scroll",
    () => {
      header.classList.toggle("scrolled", window.scrollY > 40);
    },
    { passive: true }
  );
}

// ============= Mobile Menu =============
function initMobileMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  const navLinks = document.querySelectorAll(".nav a");

  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    toggle.classList.toggle("active");
    nav.classList.toggle("active");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      toggle.classList.remove("active");
      nav.classList.remove("active");
      document.body.style.overflow = "";
    });
  });
}
