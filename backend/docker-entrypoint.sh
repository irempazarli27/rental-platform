#!/bin/sh
set -e

echo "Running database migrations..."
./node_modules/.bin/node-pg-migrate -m src/db/migrations up

echo "Starting server..."
exec "$@"
