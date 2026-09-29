import { prisma } from "./db.ts";

export interface Frase {
  titulo_libro: string;
  texto_frase: string;
  etiquetas: string[];
  createdAt: Date;
}

export async function agregarFrase(frase: Frase, userId: string, isPublic: boolean) {
  const nuevaFrase = await prisma.frases_libros.create({
    data: { ...frase, userId, isPublic },
  });
  console.log("Nueva Frase Creada con ID " + nuevaFrase.id);
}

export async function eliminarDuplicados(texto: string) {
  await prisma.frases_libros.deleteMany({
    where: {
      texto_frase: texto,
    },
  });
}

// Frases públicas — visibles para cualquiera, sin necesidad de sesión.
export async function obtenerFrasesPublicas() {
  return await prisma.frases_libros.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
  });
}

// Todas las frases de un usuario (públicas y privadas), para su propio espacio.
export async function obtenerMisFrases(userId: string) {
  return await prisma.frases_libros.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function addBookmark(userId: string, author: string, slug: string) {
  return await prisma.bookmarkedBook.upsert({
    where: { userId_author_slug: { userId, author, slug } },
    create: { userId, author, slug },
    update: {},
  });
}

export async function removeBookmark(userId: string, author: string, slug: string) {
  await prisma.bookmarkedBook.deleteMany({ where: { userId, author, slug } });
}

export async function listBookmarks(userId: string) {
  return await prisma.bookmarkedBook.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function addNote(userId: string, content: string) {
  return await prisma.note.create({ data: { userId, content } });
}

export async function listNotes(userId: string) {
  return await prisma.note.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function deleteNote(userId: string, noteId: number) {
  await prisma.note.deleteMany({ where: { id: noteId, userId } });
}
