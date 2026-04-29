#Dockerfile: Es un archivo que contiene las instrucciones para crear una imagen de Docker. 
#La imagen es una plantilla que se utiliza para crear contenedores como codigos, librerias, fuentes, etc.
FROM node:20-alpine

WORKDIR /app

COPY package.json ./


RUN npm install

COPY . .

EXPOSE 4001

CMD ["sh", "-c", "npm run migrate && npm start"]