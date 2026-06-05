document.addEventListener("DOMContentLoaded", () => {
  let selectedText = "";

  // Listen globally for text highlights
  document.addEventListener("mouseup", checkSelection);
  document.addEventListener("keyup", checkSelection);
  document.addEventListener("touchend", checkSelection);

  function checkSelection() {
    const selection = window.getSelection();
    selectedText = selection.toString().trim();
    const readerArea = document.getElementById("previewContent");
    const saveBtn = document.getElementById("static-save-btn");

    if (!saveBtn) return;

    if (
      selectedText.length > 0 && readerArea &&
      readerArea.contains(selection.anchorNode)
    ) {
      saveBtn.classList.remove("disabled");
      saveBtn.textContent = "Guardar";
    } else {
      if (document.activeElement === saveBtn) return;
      saveBtn.classList.add("disabled");
    }
  }
  document.addEventListener("click", async (e) => {
    if (e.target && e.target.id === "static-save-btn") {
      const saveBtn = e.target;
      if (saveBtn.classList.contains("disabled") || !selectedText) return;

      saveBtn.blur();

      // Prompt the user for tags
      const tagsInput = prompt(
        "Añade etiquetas separadas por comas (ej: estoico, sabiduria):",
        "",
      );
      const tags = (tagsInput || "").split(",").filter((t) => t.trim() !== "")
        .map((t) => t.trim());
      saveBtn.textContent = "Guardando...";

      try {
        const response = await fetch("/api/save-phrase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            texto_frase: selectedText,
            titulo_libro: document.querySelector(".active-book-title")
              ?.textContent,
            etiquetas: tags, // Send the tags to the backend
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            saveBtn.textContent = "Guardado";
            saveBtn.classList.add("disabled");
          } else {
            saveBtn.textContent = "Error";
            console.error("Server returned success: false");
          }
        } else {
          saveBtn.textContent = "HTTP:" + response.status;
        }
      } catch (error) {
        clearTimeout(timeoutId);
        // 2. This will reveal if it's a timeout or a network connection issue
        if (error.name === "AbortError") {
          saveBtn.textContent = "Error";
        } else {
          saveBtn.textContent = "Error: " + error.message;
          console.error("Fetch error:", error);
        }
      }
    }
  });

  // Nota: Ya no es necesario 'window.exportSavedPhrasesToFile'
  // porque ahora tu base de datos es la fuente de verdad (SQLite).
});
