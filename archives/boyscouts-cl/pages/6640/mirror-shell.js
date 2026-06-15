(function () {
  if (document.querySelector(".mirror-nav")) return;

  var path = window.location.pathname;
  var match = path.match(/^(.*\/archives\/boyscouts-cl)(?:\/.*)?$/);
  var archiveRoot = match ? match[1] : "/archives/boyscouts-cl";

  var nav = document.createElement("aside");
  nav.className = "mirror-nav";
  nav.setAttribute("aria-label", "Navegacion del espejo");

  var label = document.createElement("p");
  label.className = "mirror-nav__label";
  label.textContent = "Respaldo HTML de lectura. Navega el sitio clonado o vuelve a la biblioteca.";

  var actions = document.createElement("div");
  actions.className = "mirror-nav__actions";

  var archiveLink = document.createElement("a");
  archiveLink.className = "mirror-nav__link mirror-nav__link--primary";
  archiveLink.href = archiveRoot + "/";
  archiveLink.textContent = "Indice del archivo";

  var libraryLink = document.createElement("a");
  libraryLink.className = "mirror-nav__link mirror-nav__link--ghost";
  libraryLink.href = "/";
  libraryLink.textContent = "Volver a biblioteca";

  actions.appendChild(archiveLink);
  actions.appendChild(libraryLink);
  nav.appendChild(label);
  nav.appendChild(actions);

  var target = document.body || document.documentElement;
  target.appendChild(nav);
})();
