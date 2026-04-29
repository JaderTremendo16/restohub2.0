require("dotenv").config();
const express = require("express");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const typeDefs = require("./src/graphql/schema");
const resolvers = require("./src/graphql/resolvers");
const { connectRabbitMQ, getChannel } = require("./src/messaging/connection");
const { listenToKitchen } = require("./src/messaging/consumer");
const { Client } = require("pg");
const knex = require("knex");
const knexConfig = require("./knexfile");
const mpRoutes = require("./src/routes/mercadopago");
const paypalRoutes = require("./src/routes/paypal");

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.get("/health", (req, res) =>
  res.json({ status: "ok", service: "pos-service" }),
);

async function ensureDatabase() {
  const maxRetries = 10;
  let retries = 0;
  while (retries < maxRetries) {
    const client = new Client({
      host: process.env.DB_HOST || "localhost",
      port: 5432,
      user: process.env.POSTGRES_USER || process.env.DB_USER,
      password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
      database: "postgres",
    });

    try {
      await client.connect();
      const dbName = process.env.DB_NAME || "db_pos_service";
      const exists = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName],
      );

      if (exists.rows.length === 0) {
        await client.query(`CREATE DATABASE ${dbName}`);
        console.log(`✅ Base de datos '${dbName}' creada`);
      } else {
        console.log(`✅ Base de datos '${dbName}' ya existe`);
      }

      await client.end();
      return; // Success
    } catch (err) {
      retries++;
      console.error(`❌ Error asegurando base de datos (intento ${retries}/${maxRetries}):`, err.message);
      if (retries >= maxRetries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

async function runMigrations() {
  const db = knex(knexConfig.development);
  await db.migrate.latest();
  console.log("✅ Migraciones ejecutadas");
  await db.destroy();
}

async function startServer() {
  await ensureDatabase();
  await runMigrations();

  const server = new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs, resolvers }),
  });

  await server.start();
  app.use("/graphql", express.json(), expressMiddleware(server));
  await connectRabbitMQ();

  app.use(mpRoutes);
  app.use(paypalRoutes);

  app.listen(PORT, () => {
    console.log(`POS Service corriendo en http://localhost:${PORT}`);
    console.log(`GraphQL en http://localhost:${PORT}/graphql`);
  });
}

startServer().catch((err) => {
  console.error("💥 ERROR FATAL AL INICIAR EL SERVICIO POS:", err);
  process.exit(1);
});
