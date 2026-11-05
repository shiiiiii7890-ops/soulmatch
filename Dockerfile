
# Stage 1: Build React frontend
FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build


# Stage 2: Backend + Nginx production image
FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx gettext-base && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend
COPY backend/ /app/backend/

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Copy deployment configuration
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/start.sh /app/start.sh

RUN sed -i 's/\r$//' /app/start.sh && \
    chmod +x /app/start.sh && \
    rm -f /etc/nginx/sites-enabled/default

ENV PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["/app/start.sh"]
