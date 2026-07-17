import { prisma } from "./db.ts";

export interface Frase {
  titulo_libro: string;
  texto_frase: string;
  etiquetas: string[];
  createdAt: Date;
}
// 1. Create a new user
export async function agregarFrase(frase :Frase){
try {
  const nuevaFrase = await prisma.frases_libros.create({
    data: frase,
  });
console.log("Nueva Frase Creada con ID" + nuevaFrase.id)
} catch (error) {
  console.log(error)
}
}

export async function eliminarDuplicados(texto: string){
await prisma.frases_libros.deleteMany({
  where: {
    texto_frase: texto,
    // other conditions
  },
});
}
export async function obtenerFrases(){
    const allFrases = await prisma.frases_libros.findMany();
    return allFrases;
}

  