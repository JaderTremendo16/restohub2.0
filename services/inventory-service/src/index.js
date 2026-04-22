//Todo lo mismo que el index de ingredient service
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";
import dotenv from "dotenv";

import typeDefs from "./graphql/schema.js";
import resolvers from "./graphql/resolvers.js";
import database from "./database/knex.js";
import { connectRabbitMQ } from "./rabbitmq.js";
import { startConsumer } from "./messaging/consumer.js";
import { startInventoryJobs } from "./jobs/inventoryJobs.js";

dotenv.config();

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

async function start() {
  // Conexión a DB es crítica para arrancar
  try {
    await database.raw("SELECT 1");
    console.log("✓ Conectado a PostgreSQL");
  } catch (err) {
    console.error("❌ Error crítico conectando a PostgreSQL:", err.message);
    process.exit(1);
  }

  // Arrancamos el servidor de Apollo PRIMERO para que el HealthCheck de Docker pase rápido
  const { url } = await startStandaloneServer(server, {
    context: async () => ({ database }),
    listen: { port: parseInt(process.env.PORT) || 4003 },
  });
  console.log(`🚀 Inventory Service corriendo en ${url}`);

  // RabbitMQ y Jobs pueden arrancar en "background" sin bloquear el puerto
  connectRabbitMQ()
    .then(async () => {
      startInventoryJobs();
      await startConsumer();
      console.log("✓ Workers de Inventario activos");
    })
    .catch((err) => {
      console.error(
        "⚠️ Fallo en workers de RabbitMQ (Inventario):",
        err.message,
      );
    });
}

start();
