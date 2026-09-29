// routes/api.ts
import { buildIndex, normalizeText } from "./mainFunctions.ts"
import {
  addBookmark,
  addNote,
  agregarFrase,
  deleteNote,
  listBookmarks,
  listNotes,
  obtenerFrasesPublicas,
  obtenerMisFrases,
  removeBookmark,
} from "./dbOperations.ts"
import { getSessionUser, handleAuthRequest } from "./auth.ts"

// Ejecutamos la indexación al arrancar
const libraryIndex = await buildIndex();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function handleApiRequest(req: Request, url: URL): Promise<Response> {

  // 0. Rutas de autenticación
  if (url.pathname.startsWith("/api/auth")) {
    return await handleAuthRequest(req, url);
  }

  // 1. API de Búsqueda
  if (url.pathname === "/search" && req.method === "GET") {
    const rawQuery = url.searchParams.get("q");
    const authorFilter = url.searchParams.get("author"); // Get the author from query params
    const partial = url.searchParams.get("partial") === "true"; // false (whole word) is the default
    if (!rawQuery) return new Response(JSON.stringify([]), { status: 400 });

    // Ignora acentos/ñ tanto en la consulta como en el texto indexado, para
    // que "aun weor" encuentre "aún weor" y viceversa.
    const query = normalizeText(rawQuery.trim());
    if (!query) return new Response(JSON.stringify([]), { status: 400 });

    const wholeWordRegex = partial ? null : new RegExp(`\\b${escapeRegExp(query)}\\b`);

    const results = libraryIndex
      .filter(doc => {
        // Por defecto exige la frase completa como palabra(s) entera(s);
        // "partial" permite que el término aparezca dentro de otra palabra.
        const matchesQuery = wholeWordRegex
          ? wholeWordRegex.test(doc.normalizedSearchableText)
          : doc.normalizedSearchableText.includes(query);

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

  // 2. Agregar Frase (POST) — requiere sesión para asociarla a un perfil
  if (url.pathname === "/api/save-phrase" && req.method === "POST") {
    const user = await getSessionUser(req);
    if (!user) return jsonResponse({ success: false, error: "No autenticado" }, 401);

    try {
      const { texto_frase, titulo_libro, etiquetas, isPublic } = await req.json();

      if (!texto_frase || typeof texto_frase !== "string" || !texto_frase.trim()) {
        return jsonResponse({ success: false, error: "Falta el texto" }, 400);
      }

      const datos_frase = {
        titulo_libro: typeof titulo_libro === "string" ? titulo_libro : "Sin título",
        texto_frase: texto_frase.trim(),
        etiquetas: Array.isArray(etiquetas) ? etiquetas.filter((t) => typeof t === "string") : [],
        createdAt: new Date(),
      };

      // Privada por defecto: sólo se hace pública si el usuario lo pide explícitamente.
      await agregarFrase(datos_frase, user.id, isPublic === true);

      return jsonResponse({ success: true });
    } catch (err) {
      console.error(err);
      return jsonResponse({ success: false, error: (err as Error).message }, 500);
    }
  }

  // 3. Frases públicas (GET) — visibles para cualquiera, sin necesidad de sesión
  if (url.pathname === "/api/frases" && req.method === "GET") {
    try {
      const quotes = await obtenerFrasesPublicas();
      return jsonResponse(quotes);
    } catch (err) {
      return jsonResponse({ error: (err as Error).message }, 500);
    }
  }

  // 3b. Mis frases (GET) — requiere sesión, incluye públicas y privadas propias
  if (url.pathname === "/api/my-frases" && req.method === "GET") {
    const user = await getSessionUser(req);
    if (!user) return jsonResponse({ error: "No autenticado" }, 401);

    try {
      const quotes = await obtenerMisFrases(user.id);
      return jsonResponse(quotes);
    } catch (err) {
      return jsonResponse({ error: (err as Error).message }, 500);
    }
  }

  // 4. Libros guardados (bookmarks)
  if (url.pathname === "/api/bookmarks" && req.method === "GET") {
    const user = await getSessionUser(req);
    if (!user) return jsonResponse({ error: "No autenticado" }, 401);
    return jsonResponse(await listBookmarks(user.id));
  }

  if (url.pathname === "/api/bookmarks" && req.method === "POST") {
    const user = await getSessionUser(req);
    if (!user) return jsonResponse({ success: false, error: "No autenticado" }, 401);
    try {
      const { author, slug } = await req.json();
      if (typeof author !== "string" || typeof slug !== "string") {
        return jsonResponse({ success: false, error: "Falta autor o libro" }, 400);
      }
      await addBookmark(user.id, author, slug);
      return jsonResponse({ success: true });
    } catch (err) {
      return jsonResponse({ success: false, error: (err as Error).message }, 500);
    }
  }

  if (url.pathname === "/api/bookmarks" && req.method === "DELETE") {
    const user = await getSessionUser(req);
    if (!user) return jsonResponse({ success: false, error: "No autenticado" }, 401);
    try {
      const { author, slug } = await req.json();
      if (typeof author !== "string" || typeof slug !== "string") {
        return jsonResponse({ success: false, error: "Falta autor o libro" }, 400);
      }
      await removeBookmark(user.id, author, slug);
      return jsonResponse({ success: true });
    } catch (err) {
      return jsonResponse({ success: false, error: (err as Error).message }, 500);
    }
  }

  // 5. Pensamientos (notas)
  if (url.pathname === "/api/notes" && req.method === "GET") {
    const user = await getSessionUser(req);
    if (!user) return jsonResponse({ error: "No autenticado" }, 401);
    return jsonResponse(await listNotes(user.id));
  }

  if (url.pathname === "/api/notes" && req.method === "POST") {
    const user = await getSessionUser(req);
    if (!user) return jsonResponse({ success: false, error: "No autenticado" }, 401);
    try {
      const { content } = await req.json();
      if (typeof content !== "string" || !content.trim()) {
        return jsonResponse({ success: false, error: "Falta el contenido" }, 400);
      }
      const note = await addNote(user.id, content.trim());
      return jsonResponse({ success: true, note });
    } catch (err) {
      return jsonResponse({ success: false, error: (err as Error).message }, 500);
    }
  }

  if (url.pathname.startsWith("/api/notes/") && req.method === "DELETE") {
    const user = await getSessionUser(req);
    if (!user) return jsonResponse({ success: false, error: "No autenticado" }, 401);
    const noteId = Number(url.pathname.slice("/api/notes/".length));
    if (!Number.isInteger(noteId)) return jsonResponse({ success: false, error: "Id inválido" }, 400);
    await deleteNote(user.id, noteId);
    return jsonResponse({ success: true });
  }

  // 6. Abrir un libro puntual de la biblioteca (para libros guardados)
  if (url.pathname === "/api/book" && req.method === "GET") {
    const author = url.searchParams.get("author");
    const slug = url.searchParams.get("slug");
    const doc = libraryIndex.find((d) => d.author === author && d.name === slug);
    if (!doc) return jsonResponse({ error: "Libro no encontrado" }, 404);
    return jsonResponse({ name: doc.name, content: doc.content, author: doc.author });
  }

  // Fallback para rutas API no encontradas
  return new Response(JSON.stringify({ error: "Endpoint not found" }), { 
    status: 404, 
    headers: { "Content-Type": "application/json" } 
  });
}