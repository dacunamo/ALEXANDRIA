let currentResults = [];
let allResults = [];
let lastQuery = null;
let activeMatch = 0;
let matchCount = 0;
let lastRenderedContent = "";

document.addEventListener("DOMContentLoaded", () => {
  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        search();
      }
    });
  }
});

async function search() {
  const searchBox = document.getElementById("searchBox");
  const overlay = document.getElementById("loading-overlay");
  if (!searchBox) return;

  const q = searchBox.value.trim();

  if (!q) {
      console.log("Execution stopped: 'q' is empty, null, or undefined.");
      return;
  }
  if (overlay) overlay.style.display = "flex";
  try {
    // Always fetch the full result set for this query (all authors).
    // Switching the author filter afterwards never needs a new request.
    const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
    allResults = await res.json();
    lastQuery = q;

    filterByAuthor();

    if (window.innerWidth <= 768) {
      const sidebar = document.getElementById("sidebar");
      if (sidebar && !sidebar.classList.contains("active")) {
        toggleSidebar();
      }
    }
  } catch (err) {
    console.error("Error en la búsqueda:", err);
  } finally {
    if (overlay) overlay.style.display = "none";
  }
}

function filterByAuthor() {
  const resultsList = document.getElementById("resultsList");
  const authorSelect = document.getElementById("authorSelect");
  if (!resultsList || !authorSelect || lastQuery === null) return;

  const author = authorSelect.value;
  currentResults = author === "all"
    ? allResults
    : allResults.filter((r) => r.author?.toLowerCase() === author.toLowerCase());

  renderResultsList(currentResults, resultsList);
}

function renderResultsList(results, resultsList) {
  resultsList.innerHTML = "";

  results.forEach((f, i) => {
    // 1. Create the container element
    const div = document.createElement("div");
    div.className = "result-item";

    // 2. Set the content safely (prevents XSS)
    div.textContent = f.name;

    // 3. Attach the event listener directly (avoids inline JS strings)
    div.addEventListener("click", () => {
      window.renderFile(i, lastQuery);
    });

    // 4. Append to the results list
    resultsList.appendChild(div);
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.classList.toggle("active");
}

window.internalSearch = (q) => {
  const body = document.getElementById("fileBody");
  if (!body) return;

  if (!q || q.trim() === "") {
    body.innerHTML = lastRenderedContent;
    matchCount = 0;
    updateCounter(0, 0);
    return;
  }

  body.innerHTML = lastRenderedContent;

  const checkbox = document.getElementById("wholeWord");
  const isWholeWord = checkbox ? checkbox.checked : false;
  const escapedQ = q.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
  const basePattern = isWholeWord ? `\\b${escapedQ}\\b` : escapedQ;
  const regex = new RegExp(basePattern, "gi");

  const walker = document.createTreeWalker(
    body,
    NodeFilter.SHOW_TEXT,
    null,
    false,
  );
  const textNodes = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  let count = 0;
  textNodes.forEach((node) => {
    const text = node.nodeValue;
    if (regex.test(text)) {
      const span = document.createElement("span");
      span.innerHTML = text.replace(regex, (match) => {
        return `<span class="match" id="match-${count++}">${match}</span>`;
      });
      if (node.parentNode) node.parentNode.replaceChild(span, node);
    }
  });

  matchCount = count;
  activeMatch = 0;
  updateCounter(matchCount > 0 ? 1 : 0, matchCount);

  if (matchCount > 0) scrollMatch(0);
};

window.navMatch = (dir) => {
  if (matchCount === 0) return;
  activeMatch = (activeMatch + dir + matchCount) % matchCount;
  scrollMatch(activeMatch);
  updateCounter(activeMatch + 1, matchCount);
};

function scrollMatch(idx) {
  const el = document.getElementById("match-" + idx);
  if (el) {
    el.scrollIntoView({ behavior: "instant", block: "center" });
    // Resaltado de coincidencia activa
    document.querySelectorAll(".match").forEach((m) =>
      m.classList.remove("match-active")
    );
    el.classList.add("match-active");
  }
}

function updateCounter(current, total) {
  const counter = document.getElementById("counter");
  if (counter) counter.innerText = `${current} / ${total}`;
}
