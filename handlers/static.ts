// routes/static.ts
import { serveFile } from "https://deno.land/std@0.224.0/http/file_server.ts"; // Adjust version as needed

// 1. Define all custom route aliases in a clean, readable dictionary
const routeMap: Record<string, string> = {
  "/":             "./src/web/loader.html",
  "/frases":       "./src/web/frases.html",
  "/app":          "./src/web/index.html",
  "/tonica":   "./src/web/tonica.html",
};

export async function handleStaticFiles(req: Request, url: URL): Promise<Response> {
  // 2. Look up the path in our map. If it doesn't exist, default to the requested path.
  const filePath = routeMap[url.pathname] || `.${url.pathname}`;

  try {
    return await serveFile(req, filePath);
  } catch (_e) {
    return new Response("Archivo no encontrado", { status: 404 });
  }
}