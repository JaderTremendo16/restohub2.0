//Todo lo mismo que el index de ingredient service
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";
import dotenv from "dotenv";
import http from "http";
import { register, collectDefaultMetrics } from "prom-client";

import typeDefs from "./graphql/schema.js";
import resolvers from "./graphql/resolvers.js";
import database from "./database/knex.js";

dotenv.config();

collectDefaultMetrics({ labels: { service: "menu-service" } });
http.createServer(async (req, res) => {
  if (req.url === "/metrics") {
    res.setHeader("Content-Type", register.contentType);
    res.end(await register.metrics());
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
}).listen(4012, () => console.log("📊 Servidor de métricas en puerto 4012"));

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

async function start() {
  try {
    await database.raw("SELECT 1");
    console.log("Conectado a PostgreSQL");

    const { url } = await startStandaloneServer(server, {
      context: async () => ({ database }),
      listen: { port: parseInt(process.env.PORT) || 4002 },
    });
    console.log(` Menu Service corriendo en ${url}`);
  } catch (error) {
    console.error(" Error arrancando el servicio:", error);
    process.exit(1);
  }
}

start();
