#!/bin/sh
set -e

# Persistent disks (Render's included) mount as root-owned, so a container that
# starts as `node` cannot write snapshots into them. Start as root, hand the
# storage directory to `node`, then drop privileges before running the app.
if [ "$(id -u)" = "0" ]; then
  mkdir -p "${ROOM_STORAGE_DIR:-/data/rooms}"
  chown -R node:node "${ROOM_STORAGE_DIR:-/data/rooms}"
  exec su-exec node "$@"
fi

# Already unprivileged (e.g. `docker run --user`): run as-is.
exec "$@"
