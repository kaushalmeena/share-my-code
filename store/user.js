const USER_STORE = [];

function addUser(id, name, room) {
  const existingUser = USER_STORE.find((user) => user.name === name);

  if (existingUser) {
    return { error: "Username has already been taken" };
  }
  if (!name && !room) {
    return { error: "Username and Room are required" };
  }
  if (!name) {
    return { error: "Username is required" };
  }
  if (!room) {
    return { error: "Room is required" };
  }

  const user = { id, name, room };
  USER_STORE.push(user);

  return { user };
}

function getUser(id) {
  return USER_STORE.find((user) => user.id === id);
}

function deleteUser(id) {
  const foundIndex = USER_STORE.findIndex((user) => user.id === id);
  if (foundIndex > -1) {
    return USER_STORE.splice(foundIndex, 1)[0];
  }
  return null;
}

function getUsersInRoom(room) {
  return USER_STORE.filter((user) => user.room === room);
}

module.exports = {
  addUser,
  getUser,
  deleteUser,
  getUsersInRoom
};
