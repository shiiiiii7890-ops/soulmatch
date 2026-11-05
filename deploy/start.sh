
#!/bin/sh
set -eu

: "${PORT:=8080}"
export PORT

envsubst '${PORT}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

cd /app/backend

uvicorn server:app --host 127.0.0.1 --port 8001 &

exec nginx -g 'daemon off;'
