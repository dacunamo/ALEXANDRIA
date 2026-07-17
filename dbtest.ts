import { prisma } from "./handlers/db.ts";
import { agregarFrase, eliminarDuplicados, obtenerFrases } from "./handlers/dbOperations.ts"
// 1. Create a new user
const frase = {
      titulo_libro: "Tratado de Psicología Revolucionaria 2 ",
      texto_frase: "La mayor alegría para el Espíritu Secreto, es el despertar de la Conciencia. 2",
      // PostgreSQL handles String[] directly as standard JavaScript arrays
      etiquetas: ["Despertar", "Conciencia", "Cuerpos"], 
      createdAt: new Date()
    }
//await agregarFrase(frase)
await eliminarDuplicados("La mayor alegría para el Espíritu Secreto, es el despertar de la Conciencia. 2")
// 2. Fetch all users
const allFrases = await obtenerFrases()
console.log("Todas las frases en la Base de Datos", allFrases);