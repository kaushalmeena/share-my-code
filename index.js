import compression from "compression";
import express from "express";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import nunjucks from "nunjucks";
import { Server } from "socket.io";
// eslint-disable-next-line import/extensions
import userStore from "./store/user.js";

const filename = fileURLToPath(import.meta.url);
const directory = dirname(filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

const DEVELOPMENT_MODE = app.get("env") === "development";

const PORT = process.env.PORT || 3000;

const PUBLIC_FOLDER = join(directory, "public");
const VIEWS_FOLDER = join(directory, "views");

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
    title: "Editor",
    room: req.params.room
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log("Express server listening on port http://localhost:%d", PORT);
});

io.on("connection", (socket) => {
  socket.on("join", ({ name, room }, callback) => {
    const { user, error } = userStore.createUser(socket.id, name, room);
    if (error) {
      return callback(error);
    }
    const usersInRoom = userStore.fetchUsersInRoom(room);
    socket.join(user.room);
    socket.in(room).emit("notification", `${user.name} just entered the room`);
    io.in(room).emit("usersChange", usersInRoom);
    return callback();
  });

  socket.on("sendMessage", (message) => {
    const user = userStore.fetchUser(socket.id);
    if (user) {
      socket.in(user.room).emit("message", { username: user.name, message });
    }
  });

  socket.on("updateCode", (code) => {
    const user = userStore.fetchUser(socket.id);
    if (user) {
      socket.in(user.room).emit("codeChange", code);
    }
  });

  socket.on("disconnect", () => {
    const user = userStore.deleteUser(socket.id);
    if (user) {
      const usersInRoom = userStore.fetchUsersInRoom(user.room);
      io.in(user.room).emit("notification", `${user.name} just left the room`);
      io.in(user.room).emit("usersChange", usersInRoom);
    }
  });
});
