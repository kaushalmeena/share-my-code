const USERS = [];

function addUser(id, name, room) {
  const existingUser = USERS.find(user => user.name.trim().toLowerCase() === name.trim().toLowerCase())

  if (existingUser) {
    return { error: "Username has already been taken" };
  }
  if (!name && !room) {
    return { error: "Username and RoomId are required" };
  }
  if (!name) {
    return { error: "Username is required" };
  }
  if (!room) {
    return { error: "RoomId is required" };
  }

  const user = { id, name, room };
  USERS.push(user);

  return { user };
}

function getUser(id) {
  return USERS.find(user => user.id == id);
}

function deleteUser(id) {
  const index = USERS.findIndex((user) => user.id === id);
  if (index !== -1) {
    return USERS.splice(index, 1)[0];
  }
}

function getUsersInRoom(room) {
  return USERS.filter(user => user.room === room);
}

module.exports = { addUser, getUser, deleteUser, getUsersInRoom };