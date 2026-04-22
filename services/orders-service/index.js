const express = require("express");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const typeDefs = require("./src/graphql/schema");
const resolvers = require("./src/graphql/resolvers");
const { connectRabbitMQ } = require("./src/messaging/connection");
const { listenToKitchen } = require("./src/messaging/consumer_listo");
const { dailyCloseJob } = require("./src/jobs/dailyClose.job");
const rappiRoutes = require("./src/routes/rappi.routes");
const mpRoutes = require("./src/routes/mercadopago");
const paypalRoutes = require("./src/routes/paypal");
const knex = require("knex");
const knexConfig = require("./knexfile");

const app = express();
const PORT = 3001;

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const healthRoutes = require("./src/routes/health.routes");
const orderRoutes = require("./src/routes/orders.routes");
const invoiceRoutes = require("./src/routes/invoices.routes");
const paymentRoutes = require("./src/routes/payments.routes");

app.use(healthRoutes);
app.use(orderRoutes);
app.use(invoiceRoutes);
app.use(paymentRoutes);
app.use(rappiRoutes);

async function runMigrations() {
  console.log("🛠 Ejecutando migraciones de base de datos...");
  const db = knex(knexConfig.development);
  try {
    await db.migrate.latest();
    console.log("✅ Migraciones completadas con éxito.");
  } catch (err) {
    console.error("❌ Error en migraciones:", err.message);
  } finally {
    await db.destroy();
  }
}

async function startServer() {
  await runMigrations();
  const server = new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs, resolvers }),
  });

  await server.start();

  app.use("/graphql", express.json(), expressMiddleware(server));
  app.use(mpRoutes);
  app.use(paypalRoutes);

  // 🔥 ESPERA hasta conectar RabbitMQ de verdad
  const channel = await connectRabbitMQ();

  // 🔥 AHORA sí activa el consumer
  await listenToKitchen(channel);
  console.log("🚀 Orders-Service escuchando eventos de cocina...");

  dailyCloseJob();

  app.listen(PORT, () => {
    console.log(`Orders service corriendo en http://localhost:${PORT}`);
    console.log(`GraphQL disponible en http://localhost:${PORT}/graphql`);
  });
}

startServer();
