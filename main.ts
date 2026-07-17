/**
 * Deno Alexandria App
 * Run with: deno run --allow-net --allow-read main.ts
 */
import { handleApiRequest } from "./handlers/api.ts";
import { handleStaticFiles } from "./handlers/static.ts";

Deno.serve({
  port: 8000,
  hostname: "0.0.0.0"
}, async (req) => {
  const url = new URL(req.url);

  // Intercept API & Search routes and send them to the API handler
  if (url.pathname.startsWith("/api") || url.pathname === "/search") {
    return await handleApiRequest(req, url);
  }

  // Everything else gets treated as a static file request
  return await handleStaticFiles(req, url);
});