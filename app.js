const state = {
  items: [],
  query: "",
  category: "TODAS",
  baseUrl: localStorage.getItem("scoutLibraryBaseUrl") || "",
};

const els = {
  baseUrl: document.querySelector("#base-url"),
  search: document.querySelector("#search"),
  categoryChips: document.querySelector("#category-chips"),
  results: document.querySelector("#results"),
  resultCount: document.querySelector("#result-count"),
  fileCount: document.querySelector("#file-count"),
  generatedAt: document.querySelector("#generated-at"),
  template: document.querySelector("#card-template"),
};

const COLLATOR = new Intl.Collator("es", { sensitivity: "base" });

boot();

async function boot() {
  const response = await fetch("./inventory.json");
  const data = await response.json();
  state.items = data.items;
  els.fileCount.textContent = String(data.fileCount);
  els.generatedAt.textContent = data.generatedAt;
  els.baseUrl.value = state.baseUrl;

  renderCategories();
  renderResults();

  els.search.addEventListener("input", onSearchInput);
  els.baseUrl.addEventListener("input", onBaseUrlInput);
}

function onSearchInput(event) {
  state.query = event.target.value.trim().toLowerCase();
  renderResults();
}

function onBaseUrlInput(event) {
  state.baseUrl = normalizeBaseUrl(event.target.value);
  localStorage.setItem("scoutLibraryBaseUrl", state.baseUrl);
  renderResults();
}

function renderCategories() {
  const categories = ["TODAS", ...new Set(state.items.map((item) => item.category).sort(COLLATOR.compare))];
  els.categoryChips.replaceChildren();

  for (const category of categories) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${category === state.category ? " is-active" : ""}`;
    button.textContent = category;
    button.addEventListener("click", () => {
      state.category = category;
      renderCategories();
      renderResults();
    });
    els.categoryChips.appendChild(button);
  }
}

function renderResults() {
  const filtered = state.items.filter((item) => {
    const matchesCategory = state.category === "TODAS" || item.category === state.category;
    if (!matchesCategory) return false;

    if (!state.query) return true;

    const haystack = `${item.title} ${item.file} ${item.category}`.toLowerCase();
    return haystack.includes(state.query);
  });

  filtered.sort((a, b) => COLLATOR.compare(a.title, b.title));
  els.resultCount.textContent = `${filtered.length} resultados`;
  els.results.replaceChildren();

  if (!filtered.length) {
    const empty = document.createElement("article");
    empty.className = "empty-state";
    empty.innerHTML = "<strong>Sin resultados.</strong><p>Prueba otra búsqueda o vuelve a \"TODAS\".</p>";
    els.results.appendChild(empty);
    return;
  }

  for (const item of filtered) {
    const fragment = els.template.content.cloneNode(true);
    const url = buildAssetUrl(item.file);
    const card = fragment.querySelector(".card");
    const link = fragment.querySelector(".primary-link");
    const copyButton = fragment.querySelector(".ghost-button");

    fragment.querySelector(".card-category").textContent = item.category;
    fragment.querySelector(".card-size").textContent = formatBytes(item.sizeBytes);
    fragment.querySelector(".card-title").textContent = item.title;
    fragment.querySelector(".card-path").textContent = item.file;

    if (url) {
      link.href = url;
    } else {
      link.removeAttribute("href");
      link.classList.add("is-disabled");
      link.textContent = "Configura URL base";
    }

    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(item.file);
        copyButton.textContent = "Ruta copiada";
        window.setTimeout(() => {
          copyButton.textContent = "Copiar ruta";
        }, 1200);
      } catch {
        copyButton.textContent = "No se pudo copiar";
      }
    });

    els.results.appendChild(fragment);
    card.dataset.file = item.file;
  }
}

function buildAssetUrl(file) {
  if (!state.baseUrl) return "";
  return `${normalizeBaseUrl(state.baseUrl)}/${encodePath(file)}`;
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
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
