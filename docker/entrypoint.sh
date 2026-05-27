#!/bin/sh
set -e

node migrate.mjs
exec node .output/server/index.mjs
