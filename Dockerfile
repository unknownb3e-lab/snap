FROM node:18-alpine

RUN apk add --no-cache python3 py3-pip && \
    pip3 install --no-cache-dir --break-system-packages yt-dlp && \
    ln -sf /usr/bin/yt-dlp /usr/local/bin/yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install --production=false

COPY . .

RUN mkdir -p downloads

EXPOSE 3000

CMD ["node", "server.js"]
