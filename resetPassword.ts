// One-off script: reset a user's password directly in the DB.
// There is no self-service "forgot password" flow yet (no email-sending
// infra configured), so this is how the owner resets an account by hand.
//
// Run with: deno run -A --env=.env resetPassword.ts <email> <nueva-contraseña>
import { prisma } from "./handlers/db.ts";
import { hashPassword, normalizeEmail } from "./handlers/auth.ts";

const [email, newPassword] = Deno.args;

if (!email || !newPassword) {
  console.error("Uso: deno run -A --env=.env resetPassword.ts <email> <nueva-contraseña>");
  Deno.exit(1);
}

if (newPassword.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres.");
  Deno.exit(1);
}

const normalizedEmail = normalizeEmail(email);
const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

if (!user) {
  console.error(`No existe ningún usuario con el email ${normalizedEmail}`);
  Deno.exit(1);
}

const passwordHash = await hashPassword(newPassword);

await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

// Cierra las sesiones activas para forzar un login con la nueva contraseña.
await prisma.session.deleteMany({ where: { userId: user.id } });

console.log(`Contraseña actualizada para ${user.email}. Sesiones anteriores cerradas.`);
