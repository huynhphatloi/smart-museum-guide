#!/bin/sh
set -e

# Apply pending Prisma migrations before the API accepts traffic.
# prisma lives in the workspace root node_modules (npm workspaces).
../node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma

exec node dist/main
