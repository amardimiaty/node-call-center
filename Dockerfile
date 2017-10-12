FROM node:8-alpine
WORKDIR /src
ADD . /src
RUN yarn install

EXPOSE 3000
CMD yarn start
