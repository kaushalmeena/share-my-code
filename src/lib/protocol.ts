/**
 * Wire protocol shared with the `y-websocket` client. The numbers are fixed by
 * that client — do not renumber them.
 */
export const MESSAGE_SYNC = 0;
export const MESSAGE_AWARENESS = 1;
export const MESSAGE_AUTH = 2;
export const MESSAGE_QUERY_AWARENESS = 3;

/** `messageAuth` payload kinds. Only "permission denied" exists upstream. */
export const AUTH_PERMISSION_DENIED = 0;
