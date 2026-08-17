FROM node:20-slim
WORKDIR /app

# Puppeteer/chromium system deps. Bundled chromium (~170MB) is included
# via `npm install puppeteer`; these are the shared libs and fonts it
# needs to launch headless on Debian slim. If Railway image size becomes
# painful, swap api/pdf.js to puppeteer-core + @sparticuz/chromium.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 3001

# Run as non-root — Chromium --no-sandbox is required but doesn't need root.
USER node

CMD ["node", "api/server.js"]
