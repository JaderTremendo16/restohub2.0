import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone"; // En la v4 de apollo server usamos startStandaloneServer en lugar de server.listen
import { buildSubgraphSchema } from "@apollo/subgraph";
import dotenv from "dotenv";

import typeDefs from "./graphql/schema.js";
import resolvers from "./graphql/resolvers.js";
import db from "./database/knex.js";

dotenv.config();

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  // El context ya no va aquí en la v4, se pasa al arrancar el servidor(abajo)
});

const PORT = process.env.PORT || 4001;

async function start() {
  //Aqui realizamos la conexion a la base de datos e iniciar el servidor o servicio en este caso.
  // Hacemos un try-catch para el manejo de errores.
  try {
    await db.raw("SELECT 1"); //Verifica que la conexion a la base de datos sea exitosa, mas que todo para ver si la base de datos está encendida.
    console.log("Conectado a PostgreSQL");

    // Ejecutar migraciones automáticamente
    console.log("Ejecutando migraciones...");
    await db.migrate.latest({
      directory: "./src/database/migrations",
    });
    console.log("Migraciones completadas.");

    const { url } = await startStandaloneServer(server, {
      //Aqui iniciamos el servidor
      listen: { port: PORT }, //Aqui definimos el puerto en el que se va a ejecutra el servicio, caso distinto a la version anterior de apollo que debiamos hacerlo manualmente.
      context: async () => ({ db }), // El context se define aquí ahora
    });

    console.log(`Ingredients Service corriendo en ${url}`);
  } catch (error) {
    //En caso de error, se muestra el mensaje de abajo
    console.error(" Error arrancando el servicio:", error);
    process.exit(1); //Sale del proceso si hay un error.
  }
}
// Si no realizamos un await, el programa se ejecutará sin esperar a la base de datos se conecte
// Si no se hace un try-catch, no podremos capturar errores y ni esperar que la base de datos se conecte.
start(); //En caso de que todo salga bien el try catch, arranca el servicio.
