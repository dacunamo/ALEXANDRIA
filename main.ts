/**
 * Deno Alexandria App
 * Run with: deno run --allow-net --allow-read main.ts
 */
import { serveFile } from "https://deno.land/std@0.224.0/http/file_server.ts";

const alexandriaDB = await Deno.openKv();

const DOCS_DIR = "./docs";
interface Document {
  name: string;
  content: string;
  searchableText: string; // Contenido en minúsculas para búsqueda rápida
}

let libraryIndex: Document[] = [];

async function buildIndex() {
  console.log("📚 Cargando la Gran Biblioteca en memoria...");
  const newIndex = [];

  for await (const entry of Deno.readDir(DOCS_DIR)) {
    if (entry.isFile && entry.name.endsWith(".html")) {
      const rawContent = await Deno.readTextFile(`${DOCS_DIR}/${entry.name}`);

      // Procesamos el contenido UNA SOLA VEZ al iniciar el servidor
      const bodyMatch = rawContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      let cleanContent = bodyMatch ? bodyMatch[1] : rawContent;
      cleanContent = cleanContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

      newIndex.push({
        name: entry.name.replace(".html", "").replace(" v2", ""),
        content: cleanContent,
        searchableText: cleanContent.toLowerCase() // Pre-convertido a minúsculas
      });
    }
  }
  libraryIndex = newIndex;
  console.log(`✅ ${libraryIndex.length} libros indexados. Listos para búsqueda instantánea.`);
}

// Ejecutamos la indexación al arrancar
await buildIndex();

Deno.serve({
  port: 8000,
  hostname: "0.0.0.0"
}, async (req) => {
  const url = new URL(req.url);

  //API de Búsqueda
  if (url.pathname === "/search" && req.method === "GET") {
    const query = url.searchParams.get("q")?.toLowerCase();
    if (!query) return new Response(JSON.stringify([]), { status: 400 });

    // BUSCAMOS EN MEMORIA (No hay lectura de disco aquí)
    const results = libraryIndex
      .filter(doc => doc.searchableText.includes(query))
      .map(doc => ({ name: doc.name, content: doc.content }));

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  }


  if (url.pathname === "/api/save-phrase" && req.method === "POST") {
    try {
      const { texto_frase, titulo_libro, etiquetas } = await req.json();

      if (!texto_frase) {
        return new Response(JSON.stringify({ success: false, error: "Falta el texto" }), { status: 400 });
      }

      //Agregar Frase usando Deno KV
      const id = crypto.randomUUID();
      const key = ["frases", id];

      const datos_frase = { titulo_libro, texto_frase, etiquetas, createdAt: new Date() };
      await alexandriaDB.set(key, datos_frase)
      console.log("Frase guardada!")

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ success: false, error: (err as Error).message }), { status: 500 });
    }
  }

  // API para ver las frases
  if (url.pathname === "/api/frases" && req.method === "GET") {
    try {
      const frases = alexandriaDB.list({ prefix: ["frases"] })
      const quotes = [];

      // 2. Iterate through the results
      for await (const entry of frases) {
        quotes.push(entry.value);
      }
      return new Response(JSON.stringify(quotes), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
    }
  }

  // 2. Servir archivos estáticos
  let filePath = `.${url.pathname}`;

  if (url.pathname === "/") {
    filePath = "./src/web/loader.html";
  } else if (url.pathname === "/frases") {
    filePath = "./src/web/frases.html";
  } else if (url.pathname === "/app") {
    filePath = "./src/web/index.html";
  } else if (url.pathname === "/app/tonica") {
    filePath = "./src/web/frases.html";
  }

  try {
    return await serveFile(req, filePath);
  } catch (_e) {
    return new Response("Archivo no encontrado", { status: 404 });
  }


}

);