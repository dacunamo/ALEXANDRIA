/**
 * Deno HTML Search App
 * Run with: deno run --allow-net --allow-read main.ts
 */
import { serveFile } from "https://deno.land/std@0.224.0/http/file_server.ts";

const DOCS_DIR = "./docs";

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // 1. API de Búsqueda
  if (url.pathname === "/search" && req.method === "GET") {
    const query = url.searchParams.get("q")?.toLowerCase();
    
    if (!query) return new Response(JSON.stringify([]), { status: 400 });

    const results = [];
    // Especificamos el tipo DirEntry para solucionar el error de TypeScript
    for await (const entry of Deno.readDir(DOCS_DIR)) {
      if (entry.isFile && entry.name.endsWith(".html")) {
        const rawContent = await Deno.readTextFile(`${DOCS_DIR}/${entry.name}`);
        
        // LIMPIEZA: Extraemos solo lo que está dentro de <body>
        // Esto evita que estilos o scripts externos rompan tu CSS global
        const bodyMatch = rawContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        let cleanContent = bodyMatch ? bodyMatch[1] : rawContent;
        
        // Eliminamos etiquetas <style> internas por si acaso
        cleanContent = cleanContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

        if (cleanContent.toLowerCase().includes(query)) {
          results.push({ name: entry.name, content: cleanContent });
        }
      }
    }
    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Servir archivos estáticos
  const path = url.pathname === "/" ? "./loader.html" : `.${url.pathname}`;
  
  try {
    return await serveFile(req, path);
  } catch (_e) {
    return new Response("Archivo no encontrado", { status: 404 });
  }
});