// ============= State =============
const state = {
  search: "",
  gender: "all",
  page: 1,
  nouveautesPage: 1,
};
const PAGE_SIZE = 25;
const NOUVEAUTES_PAGE_SIZE = 8;
const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

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
    NEW_ARRIVALS = PERFUMES.filter((p) => p.isNew);
    state.nouveautesPage = 1;
    if (countEl && PERFUMES.length === 0) {
      countEl.textContent = "Aucune ligne produit (vérifiez les en-têtes du Google Sheet).";
    }
  } catch (e) {
    console.error("loadProductsFromSheet:", e);
    PERFUMES = [];
    NEW_ARRIVALS = [];
    state.nouveautesPage = 1;
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

function isMobileViewport() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function scrollToTopOnMobile() {
  if (!isMobileViewport()) return;
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

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

  const list = NEW_ARRIVALS;
  const totalPages = Math.max(1, Math.ceil(list.length / NOUVEAUTES_PAGE_SIZE));
  if (state.nouveautesPage > totalPages) state.nouveautesPage = totalPages;
  if (state.nouveautesPage < 1) state.nouveautesPage = 1;

  const start = (state.nouveautesPage - 1) * NOUVEAUTES_PAGE_SIZE;
  const pageItems = list.slice(start, start + NOUVEAUTES_PAGE_SIZE);

  if (list.length === 0) {
    grid.innerHTML = `<tr><td colspan="6" class="empty">Aucune nouveauté (colonne « nouveauté » du catalogue).</td></tr>`;
  } else {
    grid.innerHTML = pageItems
      .map(
        (p) => `
      <tr>
        <td class="cell-ref">${escapeHtml(p.reference)}</td>
        <td class="cell-brand">${escapeHtml(p.brand)}</td>
        <td class="cell-name">${escapeHtml(p.name)}</td>
        <td class="hide-sm cell-muted">${escapeHtml(p.family)}</td>
        <td class="hide-md cell-muted">${escapeHtml(p.gender)}</td>
        <td class="hide-md cell-muted">${escapeHtml(p.size)}</td>
      </tr>`
      )
      .join("");
  }

  const pag = $("#nouveautes-pagination");
  const pageInfo = $("#nouveautes-page-info");
  const prevBtn = $("#nouveautes-prev-page");
  const nextBtn = $("#nouveautes-next-page");
  if (pag && pageInfo && prevBtn && nextBtn) {
    if (list.length > 0 && totalPages > 1) {
      pag.style.display = "flex";
      pageInfo.textContent = `Page ${state.nouveautesPage} / ${totalPages}`;
      prevBtn.disabled = state.nouveautesPage === 1;
      nextBtn.disabled = state.nouveautesPage === totalPages;
    } else {
      pag.style.display = "none";
    }
  }
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
  const headerSearch = $("#header-search");
  const filterSearch = $("#filter-search");
  const resultsArea = document.querySelector("#catalogue .table-wrap");

  function updateAutocompleteSuggestions(query) {
    if (!filterSearch) return;
    const listId = "search-suggestions";
    let datalist = document.getElementById(listId);
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = listId;
      document.body.appendChild(datalist);
    }
    if (filterSearch.getAttribute("list") !== listId) {
      filterSearch.setAttribute("list", listId);
    }

    const q = String(query || "").trim().toLowerCase();
    if (!q) {
      datalist.innerHTML = "";
      return;
    }

    const seen = new Set();
    const suggestions = [];
    for (const p of PERFUMES) {
      const candidates = [p.name, p.brand, p.reference].filter(Boolean);
      for (const c of candidates) {
        const value = String(c).trim();
        const key = value.toLowerCase();
        if (!key.includes(q) || seen.has(key)) continue;
        seen.add(key);
        suggestions.push(value);
        if (suggestions.length >= 8) break;
      }
      if (suggestions.length >= 8) break;
    }

    datalist.innerHTML = suggestions.map((s) => `<option value="${escapeHtml(s)}"></option>`).join("");
  }

  function autoScrollToResultsIfNeeded() {
    if (!isMobileViewport() || !resultsArea || !filterSearch) return;
    if (!filterSearch.value.trim()) return;
    // Sur mobile, on amène la liste visible pendant la saisie.
    requestAnimationFrame(() => {
      resultsArea.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  filterSearch.addEventListener("input", (e) => {
    state.search = e.target.value;
    state.page = 1;
    if (headerSearch && headerSearch.value !== state.search) {
      headerSearch.value = state.search;
    }
    updateAutocompleteSuggestions(state.search);
    renderCatalogue();
    autoScrollToResultsIfNeeded();
  });
  filterSearch.addEventListener("focus", () => {
    updateAutocompleteSuggestions(filterSearch.value);
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
    filterSearch.value = "";
    if (headerSearch) headerSearch.value = "";
    $("#filter-gender").value = "all";
    updateAutocompleteSuggestions("");
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

function bindHeaderSearch() {
  const headerSearch = $("#header-search");
  const filterSearch = $("#filter-search");
  const catalogueSection = document.getElementById("catalogue");
  const pageType = document.body.dataset.page || "";
  if (!headerSearch || !filterSearch) return;

  function goToSearchPage() {
    const query = encodeURIComponent((headerSearch.value || state.search || "").trim());
    const target = query ? `recherche.html?q=${query}` : "recherche.html";
    window.location.href = target;
  }

  // Sur la home, la barre sert de point d'entrée vers la page dédiée.
  if (pageType === "home") {
    headerSearch.addEventListener("click", (e) => {
      e.preventDefault();
      goToSearchPage();
    });
    headerSearch.addEventListener("focus", () => {
      goToSearchPage();
    });
    headerSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goToSearchPage();
      }
    });
    return;
  }

  // Initialise la barre du header avec la valeur courante.
  headerSearch.value = state.search;

  function scrollToCatalogueIfNeeded() {
    if (!catalogueSection) return;
    const rect = catalogueSection.getBoundingClientRect();
    const partiallyVisible = rect.top < window.innerHeight && rect.bottom > 120;
    if (!partiallyVisible) {
      catalogueSection.scrollIntoView({ behavior: "smooth" });
    }
  }

  headerSearch.addEventListener("focus", () => {
    if (!isMobileViewport()) {
      scrollToCatalogueIfNeeded();
    }
  });

  headerSearch.addEventListener("input", (e) => {
    state.search = e.target.value;
    state.page = 1;
    if (filterSearch.value !== state.search) {
      filterSearch.value = state.search;
    }
    if (!isMobileViewport()) {
      scrollToCatalogueIfNeeded();
    }
    renderCatalogue();
  });

  headerSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      scrollToCatalogueIfNeeded();
    }
  });
}

function bindNouveautesPagination() {
  const prev = $("#nouveautes-prev-page");
  const next = $("#nouveautes-next-page");
  if (!prev || !next) return;

  prev.addEventListener("click", () => {
    if (state.nouveautesPage > 1) {
      state.nouveautesPage--;
      renderNewArrivals();
      document.getElementById("nouveautes").scrollIntoView({ behavior: "smooth" });
    }
  });
  next.addEventListener("click", () => {
    const total = Math.max(1, Math.ceil(NEW_ARRIVALS.length / NOUVEAUTES_PAGE_SIZE));
    if (state.nouveautesPage < total) {
      state.nouveautesPage++;
      renderNewArrivals();
      document.getElementById("nouveautes").scrollIntoView({ behavior: "smooth" });
    }
  });
}

// ============= Init =============
document.addEventListener("DOMContentLoaded", () => {
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  scrollToTopOnMobile();

  void (async () => {
    bindWhatsApp();
    initMobileMenu();
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    if (document.getElementById("filter-search")) {
      const filterSearch = document.getElementById("filter-search");
      const filterGender = document.getElementById("filter-gender");
      const params = new URLSearchParams(window.location.search);
      const qParam = params.get("q");
      const gParam = params.get("genre");
      if (qParam) {
        state.search = qParam.trim();
        if (filterSearch) filterSearch.value = state.search;
      }
      if (gParam && ["all", "Femme", "Homme", "Mixte"].includes(gParam)) {
        state.gender = gParam;
        if (filterGender) filterGender.value = state.gender;
      }

      await loadProductsFromSheet();
      renderNewArrivals();
      bindNouveautesPagination();
      bindHeaderSearch();
      bindFilters();
      renderCatalogue();
    }
  })();
});

window.addEventListener("pageshow", () => {
  scrollToTopOnMobile();
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
    document.body.style.overflow = nav.classList.contains("active") ? "hidden" : "";
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      toggle.classList.remove("active");
      nav.classList.remove("active");
      document.body.style.overflow = "";
    });
  });
}
