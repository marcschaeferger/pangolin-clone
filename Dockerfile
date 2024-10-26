FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

FROM node:20-alpine AS runner

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev --legacy-peer-deps

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist

COPY config.example.yml ./dist/config.example.yml
COPY server/db/names.json ./dist/names.json

CMD ["npm", "start"]
