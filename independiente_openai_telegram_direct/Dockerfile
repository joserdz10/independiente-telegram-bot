FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-dejavu-core fontconfig ca-certificates curl \
  && mkdir -p /usr/local/share/fonts/elindependiente \
  && (curl -fL "https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/Newsreader%5Bopsz%2Cwght%5D.ttf" -o /usr/local/share/fonts/elindependiente/Newsreader.ttf || true) \
  && (curl -fL "https://raw.githubusercontent.com/google/fonts/main/ofl/sora/Sora%5Bwght%5D.ttf" -o /usr/local/share/fonts/elindependiente/Sora.ttf || true) \
  && (curl -fL "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf" -o /usr/local/share/fonts/elindependiente/Inter.ttf || true) \
  && fc-cache -f -v \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p output data
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
