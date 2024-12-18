// Import the Joi library for schema validation
const joi = require("joi");

// Function to validate user registration input
const registerValidation = (data) => {
  // Define validation schema for registration fields
  const schema = joi.object({
    username: joi.string().min(3).required(), // Username: minimum 3 characters, required
    email: joi.string().min(6).email().required(), // Email: valid email format, minimum 6 characters
    password: joi.string().min(6).required(), // Password: minimum 6 characters, required
  });

  // Validate the input data against the schema
  return schema.validate(data);
};

// Function to validate user login input
const loginValidation = (data) => {
  // Define validation schema for login fields
  const schema = joi.object({
    email: joi.string().min(6).email().required(), // Email: valid email format, minimum 6 characters
    password: joi.string().min(6).required(), // Password: minimum 6 characters, required
  });

  // Validate the input data against the schema
  return schema.validate(data);
};

// Export both validation functions
module.exports = { registerValidation, loginValidation };