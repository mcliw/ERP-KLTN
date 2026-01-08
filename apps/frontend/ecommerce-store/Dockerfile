FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . . 
RUN npm run build 

FROM alpine:latest
COPY --from=build-stage /app/dist /usr/share/nginx/html/store

CMD ["sh"]