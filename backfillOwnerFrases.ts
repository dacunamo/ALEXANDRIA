// One-off script: run once after the owner registers, to attach the
// pre-auth `frases_libros` rows (created before user accounts existed)
// to the owner's new account.
//
// Run with: deno run -A --env=.env backfillOwnerFrases.ts
import { prisma } from "./handlers/db.ts";

const OWNER_EMAIL = "daniel@reddvisible.com";

const owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });

if (!owner) {
  throw new Error(
    `No se encontró un usuario con email ${OWNER_EMAIL}. Regístrate primero en /register o /login con Google.`,
  );
}

const { count } = await prisma.frases_libros.updateMany({
  where: { userId: null },
  data: { userId: owner.id },
});

console.log(`Se asignaron ${count} frase(s) sin dueño a ${owner.email}.`);
