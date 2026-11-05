FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# A failing check stops the build, so the running container is not replaced.
RUN npm run lint:check
RUN npm test

RUN npm run build

CMD ["node", "dist/main"]
