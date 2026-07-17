// db.ts
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// 1. Establish the native Postgres driver connection
const pool = new pg.Pool({
  connectionString: Deno.env.get("DATABASE_URL"),
});

// 2. Wrap it with the Prisma 7 Adapter
const adapter = new PrismaPg(pool);

// 3. Feed the adapter into the Prisma Client
export const prisma = new PrismaClient({ adapter });