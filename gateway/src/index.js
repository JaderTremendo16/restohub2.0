// Se encarga de unir todos los microservicios en un solo punto de consulta.

import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone"; // En Apollo v4, se usa esto en lugar de server.listen.
import {
  ApolloGateway,
  IntrospectAndCompose,
  RemoteGraphQLDataSource,
} from "@apollo/gateway"; //RemoteGraphQLDataSource se usa para enviar el token de autenticación a los microservicios.
import dotenv from "dotenv";

dotenv.config(); // Cargamos las variables de entorno.

// Configuramos el Apollo Gateway para que "fusione" los esquemas de los microservicios.
async function start() {
  const maxRetries = 15;
  const retryInterval = 5000;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // IMPORTANTE: Creamos la instancia del Gateway y el Servidor DENTRO del loop.
      // Así, si falla, el siguiente reintento usa una instancia limpia.
      const gateway = new ApolloGateway({
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [
            {
              name: "ingredients",
              url: "http://ingredients-service:4001/graphql",
            },
            { name: "menu", url: "http://menu-service:4002/graphql" },
            { name: "inventory", url: "http://inventory-service:4003/graphql" },
            { name: "location", url: "http://location-service:4005/graphql" },
            { name: "staff", url: "http://staff-subgraph:4006/graphql" },
            { name: "orders", url: "http://orders-service:3001/graphql" },
            { name: "kitchen", url: "http://kitchen-service:3002/graphql" },
            { name: "pos", url: "http://pos-service:3004/graphql" },
            { name: "customer", url: "http://customer-service:8000/graphql" },
            { name: "loyalty", url: "http://loyalty-service:8001/graphql" },
          ],
        }),
        buildService: ({ url }) => {
          return new RemoteGraphQLDataSource({
            url,
            willSendRequest: ({ request, context }) => {
              if (context.token) {
                request.http.headers.set("Authorization", context.token);
              }
            },
          });
        },
      });

      const server = new ApolloServer({ gateway });

      const { url } = await startStandaloneServer(server, {
        listen: { port: 4000 },
        context: async ({ req }) => {
          const token = req?.headers?.authorization || "";
          return { token };
        },
      });

      console.log(`✓ Gateway corriendo exitosamente en ${url}`);
      return;
    } catch (error) {
      retries++;
      console.error(
        `⚠️ Intento ${retries}/${maxRetries}: El Gateway no pudo conectar con todos los microservicios.`,
      );
      console.error(`Detalle del error: ${error.message}`);
      console.log(`Reintentando en ${retryInterval / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }
  }

  console.error(
    "❌ Error fatal: El Gateway no pudo iniciar tras múltiples intentos.",
  );
  process.exit(1);
}

start();
