FROM node:18.20.4

WORKDIR /app

COPY package.json yarn.lock ./

RUN apt-get update && apt-get install -y build-essential

RUN yarn install

COPY . .

EXPOSE 3005

CMD ["node", "app.js"]
