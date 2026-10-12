#!/bin/sh
set -eu

echo "Running database migrations..."
pnpm migrate

echo "Starting API..."
exec pnpm start
