FROM node:20-alpine AS builder

WORKDIR /app

ARG REACT_APP_API_URL
ARG REACT_APP_UPLOADTHING_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_UPLOADTHING_URL=$REACT_APP_UPLOADTHING_URL

COPY package.json .
RUN npm install

COPY . .
RUN npm run build

# ── Serve with nginx ──────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

# SPA routing + API proxy
RUN echo 'server { \
  listen 80; \
  client_max_body_size 100m; \
  location /api/ { \
    proxy_pass http://backend:5000/api/; \
    proxy_http_version 1.1; \
    proxy_set_header Upgrade $http_upgrade; \
    proxy_set_header Connection "upgrade"; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    proxy_set_header X-Forwarded-Proto $scheme; \
  } \
  location / { \
    root /usr/share/nginx/html; \
    index index.html; \
    try_files $uri $uri/ /index.html; \
  } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
