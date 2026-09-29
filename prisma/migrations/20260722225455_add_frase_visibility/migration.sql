-- AlterTable
ALTER TABLE "frases_libros" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "frases_libros_isPublic_idx" ON "frases_libros"("isPublic");
