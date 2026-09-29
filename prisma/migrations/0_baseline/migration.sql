-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "frases_libros" (
    "id" SERIAL NOT NULL,
    "titulo_libro" TEXT NOT NULL,
    "texto_frase" TEXT NOT NULL,
    "etiquetas" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frases_libros_pkey" PRIMARY KEY ("id")
);

