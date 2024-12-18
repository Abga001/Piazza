const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { registerValidation, loginValidation } = require("../validations/validation");

// Register a new user
router.post("/register", async (req, res) => {
  // Validate user input
  const { error } = registerValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Check if email is already registered
  const emailExist = await User.findOne({ email: req.body.email });
  if (emailExist) return res.status(400).send("Email already exists");

  // Hash the password before saving to database
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);

  // Create a new user
  const user = new User({
    username: req.body.username,
    email: req.body.email,
    password: hashedPassword,
  });

  try {
    const savedUser = await user.save();
    res.send({ userId: savedUser._id }); // Return user ID upon success
  } catch (err) {
    res.status(400).send(err); // Error handling
  }
});

// Login a user
router.post("/login", async (req, res) => {
  // Validate user input
  const { error } = loginValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Check if user exists
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send("Email not found");

  // Compare password with hashed password
  const validPass = await bcrypt.compare(req.body.password, user.password);
  if (!validPass) return res.status(400).send("Invalid password");

  // Generate a JWT token
  const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET);
  res.header("auth-token", token).send({ token });
});

// GET all users
router.get("/all", async (req, res) => {
    try {
      const users = await User.find({}, { password: 0 }); // Exclude password field
      res.status(200).json(users);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  

module.exports = router;