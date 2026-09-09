FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production=false

COPY . .

RUN mkdir -p downloads

EXPOSE 3000

CMD ["node", "server.js"]
