FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-dejavu-core fontconfig \
  && fc-cache -f -v \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p output
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
