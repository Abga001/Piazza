// Import necessary modules
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
require("dotenv/config");

// Import route files
const authRoute = require("./routes/auth");
const postsRoute = require("./routes/posts");

// Middleware to parse incoming JSON requests
app.use(bodyParser.json());

// Route Middlewares: Connect the routes to specific paths
app.use("/api/user", authRoute); // Authentication routes
app.use("/api/posts", postsRoute); // Post CRUD operations

// Connect to MongoDB using the connection string from .env
mongoose
  .connect(process.env.DB_CONNECTOR, { useNewUrlParser: true })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection failed:", err));

// Start the server and listen on port 3000
app.listen(3000, () => console.log("Server running on port 3000"));