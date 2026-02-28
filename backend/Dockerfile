FROM node:20

WORKDIR /app

COPY package.json .
RUN npm cache clean --force && rm -rf node_modules && npm install --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
