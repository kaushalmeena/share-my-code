import { error } from "@sveltejs/kit";
import { ROOM_ID_PATTERN } from "$lib/config";
import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params }) => {
  const roomId = params.room.toLowerCase();
  if (!ROOM_ID_PATTERN.test(roomId)) {
    error(404, "That does not look like a room link.");
  }
  return { roomId };
};
