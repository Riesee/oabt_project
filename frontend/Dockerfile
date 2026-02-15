FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

ENV EXPO_PUBLIC_API_URL=http://192.168.1.107:8080

CMD ["npx", "expo", "start", "--web"]
