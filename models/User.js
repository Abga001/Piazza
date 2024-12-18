const mongoose = require("mongoose");

// Define the User schema with validation rules
const userSchema = mongoose.Schema({
  username: { type: String, required: true, min: 3, max: 256 }, // Username with min and max length
  email: { type: String, required: true, unique: true, min: 6, max: 256 }, // Unique email
  password: { type: String, required: true, min: 6, max: 1024 }, // Hashed password
  date: { type: Date, default: Date.now }, // Auto-set registration date
});

// Export the User model
module.exports = mongoose.model("User", userSchema);