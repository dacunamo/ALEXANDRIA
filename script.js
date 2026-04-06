function abrirHerramienta() {
    // Aquí puedes redirigir a la ruta de tu buscador de Deno
      window.location.href = "/index.html"; 
}

let currentResults = [];
let activeMatch = 0;
let matchCount = 0;
let lastRenderedContent = ""; // Guardamos el original para limpiar búsquedas



// 1. Búsqueda principal desde el Sidebar
async function search() {
  const searchBox = document.getElementById('searchBox');
  const resultsList = document.getElementById('resultsList');
    if (!searchBox || !resultsList) return;

  const q = searchBox.value.trim();
  if (!q) return;

  try {
      const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
      currentResults = await res.json();

      document.getElementById('resultsList').innerHTML = currentResults.map((f, i) => 
        `<div class="result-item" onclick="renderFile(${i}, '${q}')">${f.name}</div>`
      ).join('');
      // LÓGICA DE TOGGLE EN MÓVIL
        if (window.innerWidth <= 768) {
            // Si el sidebar está cerrado, lo abrimos para mostrar los hallazgos
            if (!sidebar.classList.contains('active')) {
                toggleSidebar();
            }
        }
  } catch (err) {
      console.error("Error en la búsqueda:", err);
  }
}
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('mobile-toggle');
    
    sidebar.classList.toggle('active');
    // Añadimos una clase al botón para animar las líneas si gustas
    if (btn) btn.classList.toggle('open');
}

// Nueva función puente para manejar el click y cerrar el sidebar en móvil
function handleResultClick(idx, q) {
    renderFile(idx, q);

    
}

// 2. Renderizado del archivo seleccionado
function renderFile(idx, q) {
  const container = document.getElementById('viewer-container');
  const file = currentResults[idx];
  
  // Guardamos el texto puro antes de aplicar filtros
  lastRenderedContent = file.content;
  
  // Inyectamos la barra de navegación y el cuerpo del texto
  container.innerHTML = `
    <div class="nav-bar">
    <label>
      <input type="checkbox" id="wholeWord">Palabra completa</label>
      <input id="innerSearch" placeholder="Buscar en libro">
      <button onclick="internalSearch(document.getElementById('innerSearch').value)">🔍</button>
      <span id="counter">0 / 0</span>
      <button onclick="navMatch(-1)">❮</button>
      <button onclick="navMatch(1)">❯</button>
    </div>
    <div id="previewContent">
    <div class="file-body" id="fileBody">${file.content}</div></div>
  `;
  //TEST

  // Realizar búsqueda inicial si se pasó un término desde el sidebar
  if (q) {
    document.getElementById('innerSearch').value = q;
    internalSearch(q);
  }
  // 2. FORZAMOS el cierre del sidebar si está abierto
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('active')) {
        toggleSidebar(); 
    }
}

// 3. Búsqueda interna dentro del documento abierto
window.internalSearch = (q) => {
  const body = document.getElementById('fileBody');
  const isWholeWord = document.getElementById('wholeWord').checked;
  
  if (!q || q.trim() === "") {
    body.innerHTML = lastRenderedContent;
    matchCount = 0;
    updateCounter(0, 0);
    return;
  }

  // 1. Escapamos caracteres especiales del término de búsqueda
  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const basePattern = isWholeWord ? `\\b${escapedQ}\\b` : escapedQ;

  // 2. REGEX MAESTRO: 
  // Busca el patrón PERO solo si no está dentro de una etiqueta HTML
  // Esta expresión regular evita cualquier cosa que esté entre < y >
  const regex = new RegExp(`(${basePattern})(?![^<]*>)`, 'gi');

  let count = 0;
  
  /* 3. PROCESO DE REEMPLAZO:
     Usamos una función de reemplazo que solo actúa si el match 
     es texto real y no parte de un atributo o etiqueta.
  */
  body.innerHTML = lastRenderedContent.replace(regex, (match) => {
    return `<span class="match" id="match-${count++}">${match}</span>`;
  });
  
  matchCount = count;
  activeMatch = 0;
  updateCounter(matchCount > 0 ? 1 : 0, matchCount);
  
  // Si hay resultados, hacemos scroll al primero
  if (matchCount > 0) scrollMatch(0);
};

// 4. Navegación entre resultados encontrados
window.navMatch = (dir) => {
  if (matchCount === 0) return;
  activeMatch = (activeMatch + dir + matchCount) % matchCount;
  scrollMatch(activeMatch);
  updateCounter(activeMatch + 1, matchCount);
};

function scrollMatch(idx) {
  const el = document.getElementById('match-' + idx);
  if (el) {
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
  }
}

function updateCounter(current, total) {
  const counter = document.getElementById('counter');
  if (counter) counter.innerText = `${current} / ${total}`;
}