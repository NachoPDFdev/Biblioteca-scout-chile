const CONFIG = window.SCOUT_LIBRARY_CONFIG || {};
const ASSET_BASE_URL = normalizeBaseUrl(CONFIG.assetBaseUrl || "");
const HERO_LOGO_PATH = "MATERIAL GRÁFICO/Insignias/logo-biblioteca-scout.png";

const LEGACY_GRAPHIC_PREFIX = "MATERIAL GRAFICO";
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "svg", "gif", "avif"]);
const PRIORITY_DOCUMENT_CATEGORIES = ["TROPA", "GUIAS", "DIRIGENTES", "ENA", "MANADA", "HADITAS"];
const PRIORITY_GRAPHIC_CATEGORIES = ["INSIGNIAS", "LOGOS"];
const SECTION_PREVIEW_LIMIT = 3;
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

const COLLATOR = new Intl.Collator("es", { sensitivity: "base" });

const state = {
  items: [],
  query: "",
  category: "TODAS",
  source: "static",
  expandedSections: new Set(),
};

const els = {
  search: document.querySelector("#search"),
  categoryChips: document.querySelector("#category-chips"),
  quickNav: document.querySelector("#quick-nav"),
  resultCount: document.querySelector("#result-count"),
  fileCount: document.querySelector("#file-count"),
  generatedAt: document.querySelector("#generated-at"),
  documentCount: document.querySelector("#document-count"),
  graphicCount: document.querySelector("#graphic-count"),
  configWarning: document.querySelector("#config-warning"),
  sourceNotice: document.querySelector("#source-notice"),
  documentSections: document.querySelector("#document-sections"),
  graphicSections: document.querySelector("#graphic-sections"),
  sectionTemplate: document.querySelector("#section-template"),
  cardTemplate: document.querySelector("#card-template"),
  viewer: document.querySelector("#viewer"),
  viewerBackdrop: document.querySelector("#viewer-backdrop"),
  viewerFrame: document.querySelector("#viewer-frame"),
  viewerTitle: document.querySelector("#viewer-title"),
  viewerOpen: document.querySelector("#viewer-open"),
  viewerClose: document.querySelector("#viewer-close"),
  backToTop: document.querySelector("#back-to-top"),
  heroLogo: document.querySelector("#hero-logo"),
};

boot();

async function boot() {
  const data = await loadInventory();
  const normalized = normalizeInventory(data);

  state.items = normalized.items;
  state.source = normalized.source || "static";

  els.fileCount.textContent = String(normalized.fileCount);
  els.generatedAt.textContent = normalized.generatedAt || "-";
  els.documentCount.textContent = `${normalized.documentCount} documentos`;
  els.graphicCount.textContent = `${normalized.graphicCount} recursos gráficos`;
  els.configWarning.hidden = Boolean(ASSET_BASE_URL);
  els.sourceNotice.hidden = state.source !== "static";
  setHeroLogo();

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

async function loadInventory() {
  try {
    const response = await fetch("./api/inventory");
    if (!response.ok) throw new Error(`API ${response.status}`);
    return await response.json();
  } catch (error) {
    const response = await fetch("./inventory.json");
    const data = await response.json();
    return { ...data, source: "static" };
  }
}

function normalizeInventory(data) {
  const items = (data.items || []).map(normalizeItem).filter(Boolean);
  const documentCount = items.filter((item) => item.section === "documents").length;
  const graphicCount = items.filter((item) => item.section === "graphics").length;

  return {
    generatedAt: data.generatedAt || "-",
    source: data.source || "static",
    items,
    fileCount: items.length,
    documentCount,
    graphicCount,
  };
}

function normalizeItem(item) {
  if (!item || !item.file) return null;

  const file = String(item.file);
  const extension = getExtension(file);
  const parts = file.split("/").filter(Boolean);
  const topLevel = item.collection || parts[0] || "GENERAL";
  const isGraphicSection = String(topLevel).toUpperCase() === LEGACY_GRAPHIC_PREFIX;
  const isImage = item.kind === "image" || IMAGE_EXTENSIONS.has(extension);
  const section = item.section || (isGraphicSection || isImage ? "graphics" : "documents");
  const category = item.category || (section === "graphics" ? parts[1] || "GENERAL" : parts[0] || "GENERAL");

  return {
    title: item.title || humanTitleFromFile(file),
    file,
    category,
    collection: topLevel,
    section,
    kind: item.kind || (section === "graphics" ? "image" : "document"),
    extension,
    sizeBytes: Number(item.sizeBytes || 0),
    updatedAt: item.updatedAt || "",
  };
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

function setHeroLogo() {
  const url = buildAssetUrl(HERO_LOGO_PATH);
  if (!url) return;
  els.heroLogo.src = url;
  els.heroLogo.hidden = false;
}

function renderQuickNav() {
  els.quickNav.replaceChildren();

  addQuickLink("documentos", "Documentos", "PDF");
  addQuickLink("material-grafico", "Material gráfico", "PNG y logos");
}

function addQuickLink(anchor, title, kicker) {
  const link = document.createElement("a");
  link.className = "quick-link";
  link.href = `#${anchor}`;
  link.innerHTML = `<span class="quick-link-kicker">${kicker}</span><strong>${title}</strong>`;
  els.quickNav.appendChild(link);
}

function renderSections() {
  const visible = filteredItems();
  const visibleDocuments = visible.filter((item) => item.section === "documents");
  const visibleGraphics = visible.filter((item) => item.section === "graphics");

  els.resultCount.textContent = `${visible.length} resultados`;
  els.documentSections.replaceChildren();
  els.graphicSections.replaceChildren();

  renderSectionGroup({
    container: els.documentSections,
    sectionIdPrefix: "docs",
    anchorId: "documentos",
    title: "Documentos",
    kicker: "Biblioteca PDF",
    emptyCopy: "No hay documentos para este filtro.",
    categories: orderedDocumentCategories(),
    items: visibleDocuments,
  });

  renderSectionGroup({
    container: els.graphicSections,
    sectionIdPrefix: "graphics",
    anchorId: "material-grafico",
    title: "Material gráfico",
    kicker: "Logos, insignias y recursos visuales",
    emptyCopy: "No hay recursos gráficos para este filtro.",
    categories: orderedGraphicCategories(),
    items: visibleGraphics,
  });
}

function renderSectionGroup({ container, sectionIdPrefix, anchorId, title, kicker, emptyCopy, categories, items }) {
  const wrapper = document.createElement("section");
  wrapper.className = "library-group";
  wrapper.id = anchorId;

  const head = document.createElement("div");
  head.className = "library-group-head";
  head.innerHTML = `<p class="section-kicker">${kicker}</p><h2 class="library-group-title">${title}</h2>`;
  wrapper.appendChild(head);

  if (!items.length) {
    const empty = document.createElement("article");
    empty.className = "empty-state";
    empty.innerHTML = `<strong>Sin resultados.</strong><p>${emptyCopy}</p>`;
    wrapper.appendChild(empty);
    container.appendChild(wrapper);
    return;
  }

  for (const category of categories) {
    const sectionItems = items
      .filter((item) => item.category === category)
      .sort((a, b) => COLLATOR.compare(displayTitle(a), displayTitle(b)));

    if (!sectionItems.length) continue;

    const fragment = els.sectionTemplate.content.cloneNode(true);
    const section = fragment.querySelector(".category-section");
    const grid = fragment.querySelector(".section-grid");
    const foot = document.createElement("div");
    const sectionKey = `${sectionIdPrefix}:${category}`;
    const isExpanded = state.expandedSections.has(sectionKey);
    const visibleItems = isExpanded ? sectionItems : sectionItems.slice(0, SECTION_PREVIEW_LIMIT);

    section.id = `${sectionIdPrefix}-${slugify(category)}`;
    fragment.querySelector(".section-kicker").textContent = sectionIdPrefix === "graphics" ? "Colección" : "Rama";
    fragment.querySelector(".section-title").textContent = formatCategory(category);
    fragment.querySelector(".section-count").textContent = `${sectionItems.length} archivos`;

    for (const item of visibleItems) {
      grid.appendChild(buildCard(item));
    }

    if (sectionItems.length > SECTION_PREVIEW_LIMIT) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "section-toggle";
      toggle.textContent = isExpanded
        ? `Mostrar menos de ${formatCategory(category)}`
        : `Ver todos los archivos de ${formatCategory(category)}`;
      toggle.addEventListener("click", () => {
        if (isExpanded) {
          state.expandedSections.delete(sectionKey);
        } else {
          state.expandedSections.add(sectionKey);
        }
        renderSections();
      });
      foot.className = "section-foot";
      foot.appendChild(toggle);
      fragment.querySelector(".category-section").appendChild(foot);
    }

    wrapper.appendChild(fragment);
  }

  container.appendChild(wrapper);
}

function buildCard(item) {
  const fragment = els.cardTemplate.content.cloneNode(true);
  const preview = fragment.querySelector(".card-preview");
  const link = fragment.querySelector(".primary-link");
  const inspectButton = fragment.querySelector(".ghost-button");
  const meta = fragment.querySelector(".card-meta");
  const url = buildAssetUrl(item.file);
  const title = displayTitle(item);

  fragment.querySelector(".card-category").textContent = formatCategory(item.category);
  fragment.querySelector(".card-size").textContent = [formatBytes(item.sizeBytes), item.extension.toUpperCase()].filter(Boolean).join(" · ");
  fragment.querySelector(".card-title").textContent = title;
  fragment.querySelector(".card-path").textContent = item.file;

  meta.textContent = item.section === "graphics" ? "Vista previa disponible" : "Documento listo para lectura";
  if (item.section !== "graphics") {
    fragment.querySelector(".card-path").hidden = true;
  }

  if (item.kind === "image" && url) {
    const img = document.createElement("img");
    img.className = "card-thumb";
    img.src = url;
    img.alt = title;
    img.loading = "lazy";
    preview.appendChild(img);
  } else {
    preview.innerHTML = `
      <div class="card-poster">
        <span class="card-poster-badge">${item.extension.toUpperCase()}</span>
        <strong>${posterLabel(item)}</strong>
        <p>${item.section === "graphics" ? "Recurso visual" : "Biblioteca Scout"}</p>
      </div>
    `;
  }

  if (url) {
    link.href = url;
    link.textContent = item.kind === "image" ? "Descargar imagen" : "Descargar PDF";
    link.setAttribute("download", "");
    inspectButton.textContent = item.kind === "image" ? "Ver imagen" : "Leer aquí";
    inspectButton.addEventListener("click", () => openViewer(title, url));
  } else {
    link.removeAttribute("href");
    link.classList.add("is-disabled");
    link.textContent = "Configurar R2";
    inspectButton.disabled = true;
  }

  return fragment;
}

function filteredItems() {
  return state.items.filter((item) => {
    const matchesCategory = state.category === "TODAS" || item.category === state.category;
    if (!matchesCategory) return false;
    if (!state.query) return true;

    const haystack = `${displayTitle(item)} ${item.title} ${item.file} ${item.category} ${item.collection}`.toLowerCase();
    return haystack.includes(state.query);
  });
}

function orderedCategories() {
  return [...orderedDocumentCategories(), ...orderedGraphicCategories()].filter(
    (value, index, array) => array.indexOf(value) === index
  );
}

function orderedDocumentCategories() {
  return orderedByPriority(
    [...new Set(state.items.filter((item) => item.section === "documents").map((item) => item.category))],
    PRIORITY_DOCUMENT_CATEGORIES
  );
}

function orderedGraphicCategories() {
  return orderedByPriority(
    [...new Set(state.items.filter((item) => item.section === "graphics").map((item) => item.category))],
    PRIORITY_GRAPHIC_CATEGORIES
  );
}

function orderedByPriority(categories, priorityList) {
  return categories.sort((a, b) => {
    const ia = priorityList.indexOf(a);
    const ib = priorityList.indexOf(b);
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
  if (!bytes) return "Peso no disponible";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
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

function getExtension(file) {
  const match = file.toLowerCase().match(/\.([^.\/]+)$/);
  return match ? match[1] : "";
}

function humanTitleFromFile(file) {
  return file
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function posterLabel(item) {
  if (item.section === "graphics") return item.category.slice(0, 18);
  return item.category.slice(0, 18);
}
