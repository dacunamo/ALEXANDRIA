let currentResults = [];
let activeMatch = 0;
let matchCount = 0;
let lastRenderedContent = ""; // Guardamos el original para limpiar búsquedas

// 1. Búsqueda principal desde el Sidebar
async function search() {
  const q = document.getElementById('searchBox').value.trim();
  if (!q) return;

  const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
  currentResults = await res.json();

  document.getElementById('resultsList').innerHTML = currentResults.map((f, i) => 
    `<div class="result-item" onclick="renderFile(${i}, '${q}')">${f.name}</div>`
  ).join('');
}

// 2. Renderizado del archivo seleccionado
function renderFile(idx, q) {
  const container = document.getElementById('previewContent');
  const file = currentResults[idx];
  
  // Guardamos el texto puro antes de aplicar filtros
  lastRenderedContent = file.content;
  
  // Inyectamos la barra de navegación y el cuerpo del texto
  container.innerHTML = `
    <div class="nav-bar">
    <label>
      <input type="checkbox" id="wholeWord" onchange="internalSearch(document.getElementById('innerSearch').value)">Palabra completa</label>
      <button onclick="window.parent.document.getElementById('sidebar').classList.remove('collapsed')">Menu</button>
      <input id="innerSearch" placeholder="Buscar en texto..." oninput="internalSearch(this.value)">
      <span id="counter">0 / 0</span>
      <button onclick="navMatch(-1)">Prev</button>
      <button onclick="navMatch(1)">Next</button>
    </div>
    <div class="file-body" id="fileBody">${file.content}</div>
  `;
  
  // Realizar búsqueda inicial si se pasó un término desde el sidebar
  if (q) {
    document.getElementById('innerSearch').value = q;
    internalSearch(q);
  }
}

// 3. Búsqueda interna dentro del documento abierto
window.internalSearch = (q) => {
  const body = document.getElementById('fileBody');
  const isWholeWord = document.getElementById('wholeWord').checked;
  
  if (!q) {
    body.innerHTML = lastRenderedContent;
    matchCount = 0;
    updateCounter(0, 0);
    return;
  }

  // Si isWholeWord es true, usamos \b para delimitar el inicio y fin de la palabra
  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = isWholeWord ? `\\b${escapedQ}\\b` : escapedQ;
  const regex = new RegExp(`(${pattern})`, 'gi');

  let count = 0;
  body.innerHTML = lastRenderedContent.replace(regex, (m) => 
    `<span class="match" id="match-${count++}">${m}</span>`
  );
  
  matchCount = count;
  activeMatch = 0;
  updateCounter(matchCount > 0 ? 1 : 0, matchCount);
  //if (matchCount > 0) scrollMatch(0);
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
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function updateCounter(current, total) {
  const counter = document.getElementById('counter');
  if (counter) counter.innerText = `${current} / ${total}`;
}