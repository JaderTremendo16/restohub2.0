//Todo lo mismo que el index de ingredient service
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";
import dotenv from "dotenv";

import typeDefs from "./graphql/schema.js";
import resolvers from "./graphql/resolvers.js";
import database from "./database/knex.js";

dotenv.config();

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
