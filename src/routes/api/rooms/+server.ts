import { json } from "@sveltejs/kit";
import { getRelay } from "$lib/server/relay/registry";
import type { RequestHandler } from "./$types";

/**
 * Mint a room.
 *
 * The host token comes back exactly once and is never stored server-side in
 * plaintext — only its SHA-256. Whoever holds it is the host and is the only
 * party the relay will accept writes from when the pad is locked.
 */
export const POST: RequestHandler = async () => {
  const { roomId, hostToken } = await getRelay().createRoom();
  return json({ roomId, hostToken }, { status: 201 });
};
