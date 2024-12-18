const mongoose = require("mongoose");

// Define the Post schema
const postSchema = mongoose.Schema({
  userId: { type: String, required: true }, // User ID of the post creator
  title: { type: String, required: true }, // Title of the post
  topic: { type: String, enum: ["Politics", "Health", "Sport", "Tech"], required: true }, // Topic category
  message: { type: String, required: true }, // Content of the post
  likes: { type: [String], default: [] }, // Array of user IDs who liked the post
  dislikes: { type: [String], default: [] }, // Array of user IDs who disliked the post
  comments: [{ userId: String, text: String, date: { type: Date, default: Date.now } }], // Comments array
  status: { type: String, default: "Live" }, // Status of the post (Live/Expired)
  expirationTime: { type: Date, required: true }, // Time when post expires
  createdAt: { type: Date, default: Date.now }, // Auto-set creation date
});

// Export the Post model
module.exports = mongoose.model("Post", postSchema);