const CONFIG = window.SCOUT_LIBRARY_CONFIG || {};
const ASSET_BASE_URL = normalizeBaseUrl(CONFIG.assetBaseUrl || "");

const state = {
  items: [],
  query: "",
  category: "TODAS",
};

const els = {
  search: document.querySelector("#search"),
  categoryChips: document.querySelector("#category-chips"),
  quickNav: document.querySelector("#quick-nav"),
  sections: document.querySelector("#sections"),
  resultCount: document.querySelector("#result-count"),
  fileCount: document.querySelector("#file-count"),
  generatedAt: document.querySelector("#generated-at"),
  configWarning: document.querySelector("#config-warning"),
  sectionTemplate: document.querySelector("#section-template"),
  cardTemplate: document.querySelector("#card-template"),
  viewer: document.querySelector("#viewer"),
  viewerBackdrop: document.querySelector("#viewer-backdrop"),
  viewerFrame: document.querySelector("#viewer-frame"),
  viewerTitle: document.querySelector("#viewer-title"),
  viewerOpen: document.querySelector("#viewer-open"),
  viewerClose: document.querySelector("#viewer-close"),
  backToTop: document.querySelector("#back-to-top"),
};

const COLLATOR = new Intl.Collator("es", { sensitivity: "base" });
const PRIORITY_CATEGORIES = ["TROPA", "GUIAS", "DIRIGENTES", "ENA", "MANADA", "HADITAS"];
const DISPLAY_TITLE_OVERRIDES = {
  "DIRIGENTES/Mejores-Dirigentes-OK.pdf": "Más Preparados Mejores Dirigentes",
  "POR/01-Estatuto.pdf": "Libro I Estatuto",
  "POR/02-Organizacion.pdf": "Libro II de la Organización",
  "POR/03-Himno-Institucional.pdf": "Libro III Reglamentos Himno Institucional",
  "POR/04-Reglamento-Convocatorias.pdf": "Libro III Reglamento de Convocatorias",
  "POR/05-Procedimientos-Administrativos.pdf": "Libro III Reglamento de Procedimientos Administrativos",
  "POR/06-Politicas-Religiosas.pdf": "Libro III Reglamento de Políticas Religiosas",
  "POR/07-Programa-Formacion.pdf": "Libro III Reglamento del Programa de Formación",
  "POR/08-Reglamento-Disciplinario.pdf": "Libro III Reglamento Disciplinario",
  "POR/09-Reglamento-Ceremonias.pdf": "Libro III Reglamento de Ceremonias y Protocolo",
  "POR/10-Reglamento-Condecoraciones.pdf": "Libro III Reglamento de Condecoraciones",
  "POR/12-Reglamento-Uniformes.pdf": "Libro III Reglamento de Uniformes, Insignias y Distintivos",
  "POR/13-Manual-de-Uniformes-Insignias-Distintivos-y-Banderas.pdf": "Libro III Manual de Uniformes, Insignias, Distintivos y Banderas",
  "POR/14-Manual-de-Insgnias.pdf": "Libro III Manual de Insignias",
  "POR/15-Manual-de-Distintivos.pdf": "Libro III Manual de Distintivos",
  "POR/16-Manual-de-Banderas-1.pdf": "Libro III Manual de Banderas",
  "POR/21-Manual-Sesiones-Corte.pdf": "Libro III Manual de Sesiones de la Corte Nacional de Honor",
  "POR/Manual-Directorio-1.pdf": "Libro III Manual de Procedimientos Internos del Directorio Nacional",
  "POR/Manual-de-Procedimientos-Internos-Corte.pdf": "Libro III Manual de Procedimientos Internos de la Corte Nacional de Honor",
  "POR/Manual-de-Procedimientos-Internos-del-ENA-1.pdf": "Libro III Manual de Procedimientos Internos ENA",
  "POR/Manual-Condecoraciones.pdf": "Libro III Manual de Condecoraciones",
  "POR/01-Procedimiento-Administrativo-Ingreso-de-Grupos.pdf": "Libro III Procedimiento Administrativo Ingreso de Grupos",
  "LITERATURA GENERAL/Escultismo-y-Sindrome-de-Down-Nicolas-Quezada-Concha.pdf": "Escultismo y Síndrome de Down (Escultismo de Extensión)",
  "LITERATURA GENERAL/mas-alla-del-metodo-scout-nicolas-quezada-concha.pdf": "Más Allá del Método Scout (Escultismo de Extensión)"
};

boot();

async function boot() {
  const response = await fetch("./inventory.json");
  const data = await response.json();
  state.items = data.items;

  els.fileCount.textContent = String(data.fileCount);
  els.generatedAt.textContent = data.generatedAt;
  els.configWarning.hidden = Boolean(ASSET_BASE_URL);

  renderCategories();
  renderQuickNav();
  renderSections();

  els.search.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderSections();
  });
  els.viewerClose.addEventListener("click", closeViewer);
  els.viewerBackdrop.addEventListener("click", closeViewer);
  els.backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.viewer.hidden) closeViewer();
  });
  window.addEventListener("scroll", syncScrollUi, { passive: true });
  syncScrollUi();
}

function renderCategories() {
  const categories = ["TODAS", ...orderedCategories()];
  els.categoryChips.replaceChildren();

  for (const category of categories) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${category === state.category ? " is-active" : ""}`;
    button.textContent = formatCategory(category);
    button.addEventListener("click", () => {
      state.category = category;
      renderCategories();
      renderSections();
    });
    els.categoryChips.appendChild(button);
  }
}

function renderQuickNav() {
  els.quickNav.replaceChildren();

  for (const category of orderedCategories()) {
    const link = document.createElement("a");
    link.className = "quick-link";
    link.href = `#section-${slugify(category)}`;
    link.innerHTML = `<span class="quick-link-kicker">Rama</span><strong>${formatCategory(category)}</strong>`;
    els.quickNav.appendChild(link);
  }
}

function renderSections() {
  const visible = filteredItems();
  els.resultCount.textContent = `${visible.length} resultados`;
  els.sections.replaceChildren();

  if (!visible.length) {
    const empty = document.createElement("article");
    empty.className = "empty-state";
    empty.innerHTML = "<strong>Sin resultados.</strong><p>Prueba otro término o vuelve a todas las ramas.</p>";
    els.sections.appendChild(empty);
    return;
  }

  for (const category of orderedCategories()) {
    const items = visible
      .filter((item) => item.category === category)
      .sort((a, b) => COLLATOR.compare(displayTitle(a), displayTitle(b)));

    if (!items.length) continue;

    const fragment = els.sectionTemplate.content.cloneNode(true);
    const section = fragment.querySelector(".category-section");
    const grid = fragment.querySelector(".section-grid");

    section.id = `section-${slugify(category)}`;
    fragment.querySelector(".section-kicker").textContent = "Rama";
    fragment.querySelector(".section-title").textContent = formatCategory(category);
    fragment.querySelector(".section-count").textContent = `${items.length} documentos`;

    for (const item of items) {
      grid.appendChild(buildCard(item));
    }

    els.sections.appendChild(fragment);
  }
}

function buildCard(item) {
  const fragment = els.cardTemplate.content.cloneNode(true);
  const link = fragment.querySelector(".primary-link");
  const readButton = fragment.querySelector(".read-button");
  const url = buildAssetUrl(item.file);

  fragment.querySelector(".card-category").textContent = formatCategory(item.category);
  fragment.querySelector(".card-size").textContent = formatBytes(item.sizeBytes);
  fragment.querySelector(".card-title").textContent = displayTitle(item);
  fragment.querySelector(".card-path").textContent = item.file;

  if (url) {
    link.href = url;
    link.setAttribute("download", "");
    readButton.addEventListener("click", () => openViewer(displayTitle(item), url));
  } else {
    link.removeAttribute("href");
    link.classList.add("is-disabled");
    link.textContent = "Configurar R2";
    readButton.disabled = true;
  }

  return fragment;
}

function filteredItems() {
  return state.items.filter((item) => {
    const matchesCategory = state.category === "TODAS" || item.category === state.category;
    if (!matchesCategory) return false;
    if (!state.query) return true;

    const haystack = `${displayTitle(item)} ${item.title} ${item.file} ${item.category}`.toLowerCase();
    return haystack.includes(state.query);
  });
}

function orderedCategories() {
  const categories = [...new Set(state.items.map((item) => item.category))];
  return categories.sort((a, b) => {
    const ia = PRIORITY_CATEGORIES.indexOf(a);
    const ib = PRIORITY_CATEGORIES.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return COLLATOR.compare(a, b);
  });
}

function formatCategory(category) {
  if (category === "TODAS") return "Todas";
  return category;
}

function buildAssetUrl(file) {
  if (!ASSET_BASE_URL) return "";
  return `${ASSET_BASE_URL}/${encodePath(file)}`;
}

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

function encodePath(path) {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function openViewer(title, url) {
  els.viewerTitle.textContent = title;
  els.viewerOpen.href = url;
  els.viewerFrame.src = url;
  els.viewer.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeViewer() {
  els.viewer.hidden = true;
  els.viewerFrame.src = "";
  document.body.style.overflow = "";
}

function syncScrollUi() {
  els.backToTop.classList.toggle("is-visible", window.scrollY > 420);
}

function displayTitle(item) {
  return DISPLAY_TITLE_OVERRIDES[item.file] || item.title;
}
