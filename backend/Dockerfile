FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV UPLOAD_DIR=/app/uploads

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install

COPY docker-entrypoint.sh ./docker-entrypoint.sh
COPY prisma ./prisma
COPY src ./src

RUN mkdir -p /app/uploads \
  && chmod +x ./docker-entrypoint.sh

EXPOSE 3001

CMD ["./docker-entrypoint.sh"]
