const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Check for the auth-token header
  const token = req.header("Authorization");
  if (!token) return res.status(401).send("Access Denied");

  try {
    // Extract the token after "Bearer "
    const actualToken = token.split(" ")[1];
    const verified = jwt.verify(actualToken, process.env.TOKEN_SECRET); // Verify token
    req.user = verified; // Attach user payload to request
    next(); // Move to the next middleware
  } catch (err) {
    res.status(400).send("Invalid Token");
  }
};