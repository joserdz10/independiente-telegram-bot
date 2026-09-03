FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-dejavu-core fontconfig ca-certificates curl \
  && mkdir -p /usr/local/share/fonts/elindependiente \
  && curl -fL --retry 4 --retry-delay 2 "https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/Newsreader%5Bopsz%2Cwght%5D.ttf" -o /usr/local/share/fonts/elindependiente/Newsreader.ttf \
  && curl -fL --retry 4 --retry-delay 2 "https://raw.githubusercontent.com/google/fonts/main/ofl/sora/Sora%5Bwght%5D.ttf" -o /usr/local/share/fonts/elindependiente/Sora.ttf \
  && curl -fL --retry 4 --retry-delay 2 "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf" -o /usr/local/share/fonts/elindependiente/Inter.ttf \
  && test -s /usr/local/share/fonts/elindependiente/Newsreader.ttf \
  && test -s /usr/local/share/fonts/elindependiente/Sora.ttf \
  && test -s /usr/local/share/fonts/elindependiente/Inter.ttf \
  && fc-cache -f \
  && fc-match -f '%{family}\n' Newsreader | grep -qi 'Newsreader' \
  && fc-match -f '%{family}\n' Sora | grep -qi 'Sora' \
  && fc-match -f '%{family}\n' Inter | grep -qi 'Inter' \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p output data
ENV NODE_ENV=production
ENV STRICT_BRAND_FONTS=true
EXPOSE 8080
CMD ["npm", "start"]
