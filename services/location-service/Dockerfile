FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD ["sh", "-c", "npm run migrate && npx knex seed:run --knexfile src/db/knexfile.js && npm start"]