const express = require("express");
const compression = require("compression")
const nunjucks = require("nunjucks");
const path = require("path");

const { addUser, getUser, deleteUser, getUsersInRoom } = require("./utils/users");

const app = express();

const DEVELOPMENT_MODE = app.get("env") === "development";

const PORT = process.env.PORT || 3000;

const PUBLIC_FOLDER = path.join(__dirname, "public");
const VIEWS_FOLDER = path.join(__dirname, "views");

nunjucks.configure("views", {
  autoescape: true,
  express: app,
  watch: DEVELOPMENT_MODE,
  noCache: DEVELOPMENT_MODE
});

app.use(compression());
app.use("/", express.static(PUBLIC_FOLDER));

app.set("views", VIEWS_FOLDER);
app.set("view engine", "html");

app.get("/new-editor/", (req, res) => {
  const newRoom = Math.random().toString(16).substring(8);
  res.redirect(`/editor/${newRoom}/`);
});

app.get("/", (req, res) => {
  res.render("home", {
    title: "Home"
  });
});

app.get("/editor/:room/", (req, res) => {
  res.render("editor", {
    title: "Editor"
  });
});

const server = app.listen(PORT, () => {
  console.log("Express server listening on port http://localhost:%d", PORT);
});

const io = require("socket.io")(server);

io.on("connection", (socket) => {
  socket.on("join", ({ name, room }, callback) => {
    const { user, error } = addUser(socket.id, name, room);
    if (error) {
      return callback(error);
    }
    socket.join(user.room)
    socket.in(room).emit("notification", `${user.name} just entered the room`)
    io.in(room).emit("usersChange", getUsersInRoom(room));
    callback();
  })

  socket.on("sendMessage", (message) => {
    const user = getUser(socket.id)
    if (user) {
      socket.in(user.room).emit("message", { username: user.name, message: message });
    }
  });

  socket.on("updateCode", (code) => {
    const user = getUser(socket.id)
    if (user) {
      socket.in(user.room).emit("codeChange", code);
    }
  });

  socket.on("disconnect", () => {
    const user = deleteUser(socket.id);
    if (user) {
      io.in(user.room).emit("notification", `${user.name} just left the room`);
      io.in(user.room).emit("usersChange", getUsersInRoom(user.room));
    }
  });
});
