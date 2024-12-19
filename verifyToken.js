const jwt = require("jsonwebtoken");

// Middleware to verify the JWT token
function verifyToken(req, res, next) {
  // Extract token from Authorization header
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access denied" });

  try {
    // Verify token and attach the decoded payload to req.user
    const verified = jwt.verify(token, process.env.TOKEN_SECRET);
    req.user = verified; // This will now include _id and username
    next(); // Proceed to the next middleware or route
  } catch (err) {
    res.status(400).json({ message: "Invalid token" });
  }
}

module.exports = verifyToken;