// routes/api.ts
//const alexandriaDB = await Deno.openKv();
import { buildIndex } from "./mainFunctions.ts"
import { agregarFrase, obtenerFrases } from "./dbOperations.ts"

// Ejecutamos la indexación al arrancar
const libraryIndex = await buildIndex();

export async function handleApiRequest(req: Request, url: URL): Promise<Response> {
  
  // 1. API de Búsqueda
  if (url.pathname === "/search" && req.method === "GET") {
    const query = url.searchParams.get("q")?.toLowerCase();
    const authorFilter = url.searchParams.get("author"); // Get the author from query params
    if (!query) return new Response(JSON.stringify([]), { status: 400 });

const results = libraryIndex
    .filter(doc => {
      // Always match the query text
      const matchesQuery = doc.searchableText.includes(query);
      
      // If authorFilter exists, also check that the author matches
      const matchesAuthor = authorFilter 
        ? doc.author.toLowerCase() === authorFilter.toLowerCase() 
        : true;

      return matchesQuery && matchesAuthor;
    })
    .map(doc => ({ 
      name: doc.name, 
      content: doc.content,
      author: doc.author // Optional: include it if the UI needs to display it
    }));

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Agregar Frase (POST)
  if (url.pathname === "/api/save-phrase" && req.method === "POST") {
    try {
      const { texto_frase, titulo_libro, etiquetas } = await req.json();

      if (!texto_frase) {
        return new Response(JSON.stringify({ success: false, error: "Falta el texto" }), { status: 400 });
      }

      const id = crypto.randomUUID();
      const key = ["frases", id];
      const datos_frase = { titulo_libro, texto_frase, etiquetas, createdAt: new Date() };
      
      //await alexandriaDB.set(key, datos_frase);
      console.log("Frase guardada!");

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ success: false, error: (err as Error).message }), { status: 500 });
    }
  }

  // 3. Ver las frases (GET)
  if (url.pathname === "/api/frases" && req.method === "GET") {
    try {
/*       const frases = alexandriaDB.list({ prefix: ["frases"] });
      const quotes = [];

      for await (const entry of frases) {
        quotes.push(entry.value);
      } */
      const quotes = await obtenerFrases()
      return new Response(JSON.stringify(quotes), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
    }
  }

  // Fallback para rutas API no encontradas
  return new Response(JSON.stringify({ error: "Endpoint not found" }), { 
    status: 404, 
    headers: { "Content-Type": "application/json" } 
  });
}