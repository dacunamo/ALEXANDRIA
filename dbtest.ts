import { prisma } from "./handlers/db.ts";
import { eliminarDuplicados, obtenerMisFrases } from "./handlers/dbOperations.ts"

await eliminarDuplicados("La mayor alegría para el Espíritu Secreto, es el despertar de la Conciencia. 2")

// Sanity check: list the first registered user's saved frases.
const user = await prisma.user.findFirst();
if (!user) {
  console.log("No hay usuarios registrados todavía.");
} else {
  const allFrases = await obtenerMisFrases(user.id);
  console.log(`Frases de ${user.email}:`, allFrases);
}