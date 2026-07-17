//FUNCTION TO RENDER THE BOOKS ON THE VIEWERCONTAINER
window.renderFile = function (idx, q) {
  const container = document.getElementById("viewer-container");
  if (!container || !currentResults || !currentResults[idx]) {
    console.error("Error: Contenedor o datos no válidos.");
    return;
  }

  const file = currentResults[idx];
  lastRenderedContent = file.content;

  // Limpieza total del visor
  container.textContent = "";

  // 1. Título (Nace dentro del visor)
  const bookTitleDiv = document.createElement("div");
  bookTitleDiv.id = "current-book-title";
  bookTitleDiv.className = "active-book-title";
  bookTitleDiv.textContent = `${file.name}`;
  container.appendChild(bookTitleDiv);

  // 2. Barra de Herramientas
  const navBar = document.createElement("div");
  navBar.className = "nav-bar";

  const searchOptions = document.createElement("div");
  searchOptions.className = "search-options";
  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = "wholeWord";
  label.appendChild(checkbox);
  label.appendChild(document.createTextNode(" Palabra completa"));
  searchOptions.appendChild(label);
  navBar.appendChild(searchOptions);

  const searchBox = document.createElement("div");
  searchBox.className = "search-box";

  const searchRowTop = document.createElement("div");
  searchRowTop.className = "search-row-top";

  const innerSearch = document.createElement("input");
  innerSearch.type = "search";
  innerSearch.id = "innerSearch";
  innerSearch.placeholder = "Buscar en libro";
  innerSearch.setAttribute("enterkeyhint", "search");
  innerSearch.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      window.internalSearch(innerSearch.value);
      innerSearch.blur();
    }
  });

  const searchBtn = document.createElement("button");
  searchBtn.textContent = "🔍";
  searchBtn.addEventListener("click", () => {
    window.internalSearch(innerSearch.value);
    innerSearch.blur();
  });

  const searchRowBottom = document.createElement("div");
  searchRowBottom.className = "search-row-bottom";

  const counter = document.createElement("span");
  counter.id = "counter";
  counter.textContent = "0 / 0";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "❮";
  prevBtn.addEventListener("click", () => window.navMatch(-1));

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "❯";
  nextBtn.addEventListener("click", () => window.navMatch(1));

  const toggleMinBtn = document.createElement("button");
  toggleMinBtn.textContent = "⌃";
  toggleMinBtn.className = "toggle-view-btn";
  toggleMinBtn.style.padding = "4px 8px";
  toggleMinBtn.addEventListener("click", () => {
    navBar.classList.toggle("minimized");
    toggleMinBtn.textContent = navBar.classList.contains("minimized")
      ? "⌄"
      : "⌃";
  });
  const savePhraseBtn = document.createElement("button");
  savePhraseBtn.id = "static-save-btn";
  savePhraseBtn.textContent = "Guardar";
  savePhraseBtn.className = "save-phrase-btn disabled"; // Disabled by default until text is highlighted
  savePhraseBtn.title = "Highlight text in the book to save it";

  searchRowTop.appendChild(innerSearch);
  searchRowTop.appendChild(searchBtn);
  searchRowBottom.appendChild(counter);
  searchRowBottom.appendChild(prevBtn);
  searchRowBottom.appendChild(nextBtn);
  searchRowBottom.appendChild(savePhraseBtn);
  searchRowBottom.appendChild(toggleMinBtn);

  searchBox.appendChild(searchRowTop);
  searchBox.appendChild(searchRowBottom);

  navBar.appendChild(searchOptions);
  navBar.appendChild(searchBox);
  container.appendChild(navBar);

  // 3. Contenido del Libro
  const previewContent = document.createElement("div");
  previewContent.id = "previewContent";
  const fileBody = document.createElement("div");
  fileBody.className = "file-body";
  fileBody.id = "fileBody";
  fileBody.innerHTML = file.content;

  previewContent.appendChild(fileBody);
  container.appendChild(previewContent);

  // Ejecución de búsqueda inicial si aplica
  if (q) {
    innerSearch.value = q;
    window.internalSearch(q);
  }

  // Cierre del sidebar en móvil
  const sidebar = document.getElementById("sidebar");
  if (sidebar && sidebar.classList.contains("active")) {
    toggleSidebar();
  }
};

/**
 * Fetches phrases from the API and renders them into the container.
 * Assumes the API returns: [{ titulo_libro, texto_frase, tags: "tag1,tag2" }, ...]
 */
async function loadSavedPhrases(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div id="loading-indicator" class="loading-wrapper">
      <span>Cargando frases.</span>
      <div class="spinner"></div>
    </div>
  `;

  try {
    const response = await fetch("/api/frases");
    const data = await response.json();

    container.textContent = ""; // Clear loading message

    if (data.length === 0) {
      container.textContent = "No hay frases guardadas aún.";
      return;
    }

    data.forEach((f) => {
      const div = document.createElement("div");
      div.className = "frase-item";

      const strong = document.createElement("strong");
      strong.textContent = f.titulo_libro || "Sin título";

      const p = document.createElement("p");
      p.id = "frase";
      p.textContent = `"${f.texto_frase}"`;

      div.appendChild(strong);
      div.appendChild(p);
      console.log(f.etiquetas);
      // Render Tags (if they exist)
      if (f.etiquetas) {
        const tagContainer = document.createElement("div");
        tagContainer.className = "tag-container";
        console.log(f.etiquetas);

        f.etiquetas.forEach((etiqueta) => {
          const span = document.createElement("span");
          span.className = "tag-badge";
          span.textContent = etiqueta.trim();
          tagContainer.appendChild(span);
        });

        div.appendChild(tagContainer);
      }
      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-btn";
      copyBtn.textContent = "Copiar";
      copyBtn.style.marginLeft = "auto";
      copyBtn.addEventListener("click", copyToClipboard);
      div.appendChild(copyBtn);
      container.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading phrases:", error);
    container.innerHTML = "<p>Error al cargar las frases.</p>";
  } finally {
    console.log("Process finished.");
  }
}
function abrirHerramienta() {
  // Añadimos una clase de salida para una transición suave
  const container = document.querySelector(".main-container");
  if (container) {
    container.style.opacity = "0";
    container.style.transform = "translateY(-20px)";
    container.style.transition = "all 0.8s ease";
  }

  // Redirección tras la animación
  setTimeout(() => {
    window.location.href = "/app";
  }, 600);
}
function abrirFrases() {
  setTimeout(() => {
    window.location.href = "/frases";
  }, 600);
}
function copyToClipboard(event) {
  const btn = event.target;
  const textElement = btn.parentElement.querySelector("p");
  const textToCopy = textElement.textContent;

  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      const originalText = btn.textContent;
      btn.textContent = "Copiado!";
      setTimeout(() => btn.textContent = originalText, 1000);
    });
}
