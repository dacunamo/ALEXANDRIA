import { marked } from "marked";

interface Document {
  name: string;
  content: string;
  searchableText: string;
  normalizedSearchableText: string;
  author: string // Contenido en minúsculas para búsqueda rápida
}

const DOCS_DIR = "./docs/md";
const maestros = ["samael", "lakshmi"];
let libraryIndex: Document[] = [];

// Quita acentos/diacríticos (á->a, ñ->n, etc.) para que buscar "aun weor"
// también encuentre "aún weor" y viceversa.
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export async function buildIndex() {
  console.log("📚 Cargando la Gran Biblioteca en memoria...");
  const newIndex = [];
  for (const author of maestros) {
    const folderPath = `${DOCS_DIR}/${author}`;
    try {
      for await (const entry of Deno.readDir(folderPath)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          const rawContent = await Deno.readTextFile(`${folderPath}/${entry.name}`);

          newIndex.push({
            name: entry.name.replace(".md", ""),
            content: await marked.parse(rawContent),
            searchableText: rawContent.toLowerCase(),
            normalizedSearchableText: normalizeText(rawContent),
            author: author // Uses the folder name as the author
          });
        }
      }
    } catch (e) {
      console.warn(`Advertencia: No se pudo acceder a la carpeta: ${author}`);
    }
  }

/*   for await (const entry of Deno.readDir(DOCS_DIR)) {
    if (entry.isFile && entry.name.endsWith(".html")) {
      const rawContent = await Deno.readTextFile(`${DOCS_DIR}/${entry.name}`);

      // Procesamos el contenido UNA SOLA VEZ al iniciar el servidor

      newIndex.push({
        name: entry.name.replace(".html", ""),
        content: rawContent,
        searchableText: rawContent.toLowerCase(),
        author: "lakshmi" // Pre-convertido a minúsculas
      });
    }
  } */ 
libraryIndex = newIndex;
console.log(`✅ ${libraryIndex.length} libros indexados. Listos para búsqueda instantánea.`);

return libraryIndex
}