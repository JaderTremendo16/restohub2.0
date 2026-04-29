# Se puede repetir el dockerfile de ingredientes y solo se modifica el puerto
FROM node:20-alpine

WORKDIR /app

COPY package.json ./


RUN npm install

COPY . .

EXPOSE 4003

CMD ["sh", "-c", "npm run migrate && npm start"]