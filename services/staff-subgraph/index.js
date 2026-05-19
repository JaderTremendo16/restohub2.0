import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";
import dotenv from "dotenv";
import http from "http";
import { register, collectDefaultMetrics } from "prom-client";

import typeDefs from "./graphql/schema.js";
import resolvers from "./graphql/resolvers.js";

dotenv.config();

collectDefaultMetrics({ labels: { service: "staff-subgraph" } });
http.createServer(async (req, res) => {
  if (req.url === "/metrics") {
    res.setHeader("Content-Type", register.contentType);
    res.end(await register.metrics());
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
}).listen(4016, () => console.log("📊 Servidor de métricas en puerto 4016"));

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

const PORT = process.env.PORT || 4006;

async function start() {
  try {
    const { url } = await startStandaloneServer(server, {
      listen: { port: PORT },
    });

    console.log(`Staff Subgraph corriendo en ${url}`);
  } catch (error) {
    console.error("Error arrancando staff service:", error);
    process.exit(1);
  }
}

start();
