require('dotenv').config()
const express = require('express')
const { ApolloServer } = require('@apollo/server')
const { expressMiddleware } = require('@apollo/server/express4')
const { buildSubgraphSchema } = require('@apollo/subgraph')
const typeDefs = require('./src/graphql/schema')
const resolvers = require('./src/graphql/resolvers')
const { connectRabbitMQ } = require('./src/messaging/connection')
const { consumeMessages } = require('./src/messaging/consumer')
const { dailyKitchenJob } = require('./src/jobs/dailykitchen.job')
const kitchenRoutes = require('./src/routes/kitchen.routes')

const app = express()
const PORT = process.env.PORT || 3002

app.use(express.json())
app.use(kitchenRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'kitchen-service' })
})

async function startServer() {
  const server = new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs, resolvers })
  })

  await server.start()
  app.use('/graphql', express.json(), expressMiddleware(server))

  await connectRabbitMQ()
  await consumeMessages()
  dailyKitchenJob()

  app.listen(PORT, () => {
    console.log(`Kitchen service corriendo en http://localhost:${PORT}`)
    console.log(`GraphQL disponible en http://localhost:${PORT}/graphql`)
  })
}

startServer()