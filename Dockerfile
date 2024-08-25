# Stage 1: Install dependencies
FROM node:18-alpine AS build
# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json yarn.lock /usr/src/app/
RUN yarn install

# Bundle app source
COPY . /usr/src/app

EXPOSE 3005
CMD [ "yarn", "node", "app.js" ]