import { Frases_librosScalarFieldEnum } from "./generated/prisma/internal/prismaNamespace.ts";
import { prisma } from "./handlers/db.ts";
import { agregarFrase } from "./handlers/dbOperations.ts";

const kv = await Deno.openKv(
  "https://api.deno.com/v2/databases/ea3c6683-17c1-4600-8fe9-b093e1cd9e7c/connect",
);

const frases = kv.list({ prefix: ["frases"] });

export interface Frase {
  titulo_libro: string;
  texto_frase: string;
  etiquetas: string[];
  createdAt: Date;
}

const uniquePhrases = new Map<string, Frase>();

for await (const entry of frases) {
  const raw = entry.value as any;
  const current: Frase = {
    titulo_libro: raw.titulo_libro,
    texto_frase: raw.texto_frase,
    etiquetas: Array.isArray(raw.etiquetas) ? raw.etiquetas : [],
    createdAt: new Date(raw.createdAt),
  };

  // Check if we already have this phrase
  const existing = uniquePhrases.get(current.texto_frase);

  if (!existing || current.etiquetas.length > existing.etiquetas.length) {
    // Save the new one if it's new, OR if it has more tags than the existing one
    uniquePhrases.set(current.texto_frase, current);
  }
}

for (const frase of uniquePhrases.values()) {
  try {
    await agregarFrase(frase);
  } catch (error) {
    console.error(`Error migrating "${frase.titulo_libro}":`, error);
  }
}