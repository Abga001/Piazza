const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const verifyToken = require("../verifyToken");

// Allowed topics for validation
const allowedTopics = ["Politics", "Health", "Sport", "Tech"];

// CREATE a new post
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, topic, message } = req.body;

    // Validate required fields
    if (!title || !topic || !message) 
      return res.status(400).json({ message: "All fields are required" });

    // Set current date and expiration time (5 minutes from creation)
    const createdAt = new Date();
    const expirationTime = new Date(createdAt.getTime() + 5 * 60000);

    // Create and save the new post
    const newPost = new Post({
      userId: req.user._id,
      title,
      topic,
      message,
      createdAt,
      expirationTime,
      status: "Live"
    });

    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all posts
router.get("/", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find(); // Fetch all posts from the database
    res.send(posts);
  } catch (err) {
    res.status(400).send(err);
  }
});

// GET a specific post by ID
router.get("/:postId", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId); // Find the post by ID
    if (!post) 
      return res.status(404).json({ message: "Post not found" });
    res.status(200).json(post);
  } catch (err) {
    res.status(500).json({ message: "Invalid Post ID or Server Error" });
  }
});

// GET posts by topic
router.get("/topic/:topic", verifyToken, async (req, res) => {
  try {
    const { topic } = req.params;

    // Validate the topic
    if (!allowedTopics.includes(topic)) 
      return res.status(400).json({ message: "Invalid topic provided" });

    const posts = await Post.find({ topic }); // Fetch posts matching the topic
    if (!posts.length) 
      return res.status(404).json({ message: `No posts found for topic: ${topic}` });

    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET expired posts by topic
router.get("/expired/:topic", verifyToken, async (req, res) => {
  try {
    const { topic } = req.params;

    // Validate the topic
    if (!allowedTopics.includes(topic)) 
      return res.status(400).json({ message: "Invalid topic provided" });

    const expiredPosts = await Post.find({
      topic,
      expirationTime: { $lte: new Date() }, // Posts whose expiration time has passed
    });

    res.status(200).json(expiredPosts.length ? expiredPosts : { message: "No expired posts found." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper function to get the post with the highest interest
const getHighestInterestPost = async (filter) => {
  return Post.aggregate([
    { $match: filter }, // Apply filter for matching posts
    { $addFields: { totalInterest: { $add: [{ $size: "$likes" }, { $size: "$dislikes" }] } } }, // Calculate total likes + dislikes
    { $sort: { totalInterest: -1 } }, // Sort by totalInterest in descending order
    { $limit: 1 } // Limit to the top post
  ]);
};

// GET the most active post (highest interest) in a specific topic
router.get("/active/:topic/highest-interest", verifyToken, async (req, res) => {
  try {
    const { topic } = req.params;

    // Validate the topic
    if (!allowedTopics.includes(topic)) 
      return res.status(400).json({ message: "Invalid topic provided" });

    const posts = await getHighestInterestPost({ 
      topic, 
      expirationTime: { $gte: new Date() } // Filter for active posts
    });

    if (!posts.length) 
      return res.status(404).json({ message: `No active posts found in the ${topic} topic.` });
    res.status(200).json(posts[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a comment to a post
router.post("/:postId/comment", verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;

    // Validate the comment text
    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Comment text cannot be empty" });
    }

    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the post is expired
    if (new Date() > post.expirationTime) {
      return res.status(400).json({ message: "Cannot comment on an expired post." });
    }

    // Add the comment to the comments array
    const newComment = {
      userId: req.user._id,
      userName: req.user.username, // Optional: include username if available
      text: text.trim(),
      createdAt: new Date()
    };

    post.comments.push(newComment);
    await post.save();

    res.status(200).json({ message: "Comment added successfully", comments: post.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper function to handle post interactions (like/dislike)
const updatePostInteraction = async (postId, userId, action) => {
  const post = await Post.findById(postId);
  if (!post) throw new Error("Post not found");

  if (new Date() > post.expirationTime) throw new Error("Cannot interact with an expired post");

  if (action === "like") {
    if (post.userId.toString() === userId) throw new Error("Cannot like your own post");
    if (post.likes.includes(userId)) throw new Error("Already liked this post");
    post.likes.push(userId);
  } else if (action === "dislike") {
    if (post.userId.toString() === userId) throw new Error("Cannot dislike your own post");
    if (post.dislikes.includes(userId)) throw new Error("Already disliked this post");
    post.dislikes.push(userId);
    post.likes = post.likes.filter((id) => id !== userId); // Remove like if it exists
  }
  
  // Save the post and return it
  await post.save();
  return post;
};
// POST to like or dislike a post
router.post("/:postId/:action", verifyToken, async (req, res) => {
  try {
    const { postId, action } = req.params;

    // Validate the action
    if (!["like", "dislike"].includes(action)) 
      return res.status(400).json({ message: "Invalid action" });

    // Use the helper function to handle the interaction
    const post = await updatePostInteraction(postId, req.user._id, action);

    res.status(200).json({ message: `Post ${action}d successfully`, post });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;