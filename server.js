require("dotenv").config({ quiet: true, path: "./.env" });

process.on("uncaughtException", (err) => {
  console.log("uncaught expection shutting down", err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

const app = require("./app");
const mongoose = require("mongoose");
const socket = require("socket.io");
const socketHandler = require("./controllers/socketHandler");

const port = process.env.PORT || 8000;
const URI = process.env.MONGO_URI;

if (!URI) {
  console.error("Error: MONGO_URI is not defined in environment variables");
  process.exit(1);
}

let server;

mongoose
  .connect(URI)
  .then(() => {
    console.log("Database connected successfully");
    server = app.listen(port, () => {
      console.log(`App is running on port ${port}`);
    });

    const io = socket(server, {
      cors: {
        origin: "http://localhost:3000",
        credentials: true,
      },
    });

    socketHandler(io);
  })
  .catch((err) => {
    console.error("Database connection failed", err);
    process.exit(1);
  });

process.on("unhandledRejection", (err) => {
  console.log("unhandled rejction shutting down", err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = server;
