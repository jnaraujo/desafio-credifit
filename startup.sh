#!/bin/sh
set -eu

echo "Running database migrations..."
pnpm db:migrate

echo "Starting API..."
exec pnpm start
