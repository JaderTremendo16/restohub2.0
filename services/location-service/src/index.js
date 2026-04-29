require("dotenv").config();

const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const jwt = require("jsonwebtoken");

const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");

const PORT = process.env.PORT || 4005;
const JWT_SECRET = process.env.JWT_SECRET || "restohub_secret_key";

async function main() {
  const app = express();

  const server = new ApolloServer({
    schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
    context: ({ req }) => {
      // Leer el token JWT y pasarlo a todos los resolvers
      const auth = req?.headers?.authorization || "";
      let user = null;
      if (auth.startsWith("Bearer ")) {
        try {
          const token = auth.replace("Bearer ", "");
          user = jwt.verify(token, JWT_SECRET);
        } catch {
          user = null;
        }
      }
      return { user };
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });

  app.get("/health", (_, res) => {
    res.json({ status: "ok", service: "location-service" });
  });

  app.listen(PORT, () => {
    console.log(
      `[LocationService] Corriendo en http://localhost:${PORT}/graphql`,
    );
  });
}

main().catch((err) => {
  console.error("[LocationService] Error fatal al iniciar:", err);
  process.exit(1);
});
