# syntax=docker/dockerfile:1
FROM node:18.4.0 as base
WORKDIR /api
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install

FROM base as test
ENV CI=true
COPY . .
CMD ["npm", "run", "tests"]

FROM base as prod
COPY . .
CMD ["node", "server"]