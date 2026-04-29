import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";
import dotenv from "dotenv";

import typeDefs from "./graphql/schema.js";
import resolvers from "./graphql/resolvers.js";

dotenv.config();

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
