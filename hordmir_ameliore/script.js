// ============= State =============
const state = {
  search: "",
  gender: "all",
  page: 1,
};
const PAGE_SIZE = 25;

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
  bindWhatsApp();
  initMobileMenu();
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (document.getElementById("filter-search")) {
    renderNewArrivals();
    bindFilters();
    renderCatalogue();
  }
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
