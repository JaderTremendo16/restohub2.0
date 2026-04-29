FROM node:20-alpine
WORKDIR /app

# Instalamos herramientas de red para el healthcheck
RUN apk add --no-cache curl

COPY package*.json ./

# Instalamos TODO (incluyendo knex local) para asegurar las migraciones
RUN npm install

COPY . .

EXPOSE 3001

# Usamos npx para que busque el knex que acaba de instalar en /app/node_modules
CMD sh -c "sleep 8 && npx knex migrate:latest && node index.js"