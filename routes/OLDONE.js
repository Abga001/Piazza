const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const verifyToken = require("../verifyToken");

// CREATE a post
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, topic, message } = req.body;

    // Validate required fields
    if (!title || !topic || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Generate current date and expiration time (5 minutes later)
    const createdAt = new Date();
    const expirationTime = new Date(createdAt.getTime() + 5 * 60000); // 5 minutes later

    // Create the new post
    const newPost = new Post({
      userId: req.user._id, // Authenticated user ID
      title,
      topic,
      message,
      createdAt,      // Date stamp for the post
      expirationTime, // Expiration time
      status: "Live"
    });

    // Save the post
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all posts
router.get("/", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find();
    res.send(posts);
  } catch (err) {
    res.status(400).send(err);
  }
});

// GET a specific post by ID
router.get("/:postId", verifyToken, async (req, res) => {
  try {
    // Find the post by ID
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Return the found post
    res.status(200).json(post);
  } catch (err) {
    res.status(500).json({ message: "Invalid Post ID or Server Error" });
  }
});

//GET a specific topic
router.get("/topic/:topic", verifyToken, async (req, res) => {
  try {
    const { topic } = req.params; // Correctly extract the topic from route parameters

    // Validate that the topic is valid
    const allowedTopics = ["Politics", "Health", "Sport", "Tech"];
    if (!allowedTopics.includes(topic)) {
      return res.status(400).json({ message: "Invalid topic provided" });
    }

    // Query the database for posts matching the topic
    const posts = await Post.find({ topic: topic });

    // Return posts or a 404 if no posts exist
    if (posts.length === 0) {
      return res
        .status(404)
        .json({ message: `No posts found for topic: ${topic}` });
    }

    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET expired posts by topic
router.get("/expired/:topic", verifyToken, async (req, res) => {
  try {
    const { topic } = req.params;

    // Validate topic
    const allowedTopics = ["Politics", "Health", "Sport", "Tech"];
    if (!allowedTopics.includes(topic)) {
      return res.status(400).json({ message: "Invalid topic provided" });
    }

    // Find posts where the expiration time has passed and match the topic
    const expiredPosts = await Post.find({
      topic: topic,
      expirationTime: { $lte: new Date() }, // Expired posts
    });

    // If no expired posts are found
    if (expiredPosts.length === 0) {
      return res.status(200).json({ message: "No expired posts found for this topic." });
    }

    res.status(200).json(expiredPosts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET the Tech post (active or expired) with the highest interest
router.get("/highest-interest/tech", verifyToken, async (req, res) => {
  try {
    // Use aggregation to compute total likes + dislikes and sort
    const posts = await Post.aggregate([
      {
        $match: { topic: "Tech" } // Filter for Tech posts
      },
      {
        $addFields: {
          totalInterest: { $add: [{ $size: "$likes" }, { $size: "$dislikes" }] } // Compute total interest
        }
      },
      {
        $sort: { totalInterest: -1 } // Sort by totalInterest in descending order
      },
      {
        $limit: 1 // Return only the post with the highest interest
      }
    ]);

    // If no posts are found
    if (posts.length === 0) {
      return res.status(404).json({ message: "No posts found in the Tech topic." });
    }

    // Return the post with the highest interest
    res.status(200).json(posts[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET the most active post (highest interest) in a specific topic
router.get("/active/:topic/highest-interest", verifyToken, async (req, res) => {
  try {
    const { topic } = req.params;

    // Validate the topic
    const allowedTopics = ["Politics", "Health", "Sport", "Tech"];
    if (!allowedTopics.includes(topic)) {
      return res.status(400).json({ message: "Invalid topic provided" });
    }

    // Use aggregation to compute total likes + dislikes and sort
    const posts = await Post.aggregate([
      {
        $match: {
          topic: topic,
          expirationTime: { $gte: new Date() }, // Filter for active posts
        },
      },
      {
        $addFields: {
          totalInterest: { $add: [{ $size: "$likes" }, { $size: "$dislikes" }] }, // Add combined likes + dislikes
        },
      },
      {
        $sort: { totalInterest: -1 }, // Sort by totalInterest descending
      },
      {
        $limit: 1, // Limit to the top post
      },
    ]);

    // If no posts are found
    if (posts.length === 0) {
      return res.status(404).json({ message: `No active posts found in the ${topic} topic.` });
    }

    // Return the top post
    res.status(200).json(posts[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});




// LIKE a post
router.post("/:postId/like", verifyToken, async (req, res) => {
  try {
    // Find the post
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if the user is the post owner
    if (post.userId.toString() === req.user._id) {
      return res
        .status(400)
        .json({ message: "You cannot like your own post" });
    }

    // Check if the user already liked the post
    if (post.likes.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You have already liked this post" });
    }

    // Add the user to the likes array
    post.likes.push(req.user._id);
    await post.save();

    res.status(200).json({ message: "Post liked successfully", likes: post.likes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// DISLIKE a post
router.post("/:postId/dislike", verifyToken, async (req, res) => {
  try {
    // Find the post
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if the post has expired
    if (new Date() > post.expirationTime) {
      return res.status(400).json({ message: "This post has expired and cannot be interacted with." });
    }

    // Check if the user is the post owner
    if (post.userId.toString() === req.user._id) {
      return res
        .status(400)
        .json({ message: "You cannot dislike your own post" });
    }

    // Check if the user already disliked the post
    if (post.dislikes.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You have already disliked this post" });
    }

    // Add the user to the dislikes array
    post.dislikes.push(req.user._id);

    // Remove the user from the likes array (if they previously liked it)
    post.likes = post.likes.filter((userId) => userId != req.user._id);

    // Save the updated post
    await post.save();

    res.status(200).json({
      message: "Post disliked successfully",
      dislikes: post.dislikes,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Unlike a post
router.post("/:postId/unlike", verifyToken, async (req, res) => {
  try {
    // Find the post by ID
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if the user has already liked the post
    if (!post.likes.includes(req.user._id)) {
      return res.status(400).json({ message: "You have not liked this post yet" });
    }

    // Remove the user's ID from the likes array
    post.likes = post.likes.filter((userId) => userId != req.user._id);

    // Save the updated post
    await post.save();

    res.status(200).json({ message: "You have unliked the post", likes: post.likes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a comment to a post
router.post("/:postId/comment", verifyToken, async (req, res) => {
  try {
    // Find the post by ID
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Validate the comment text
    if (!req.body.text || req.body.text.trim() === "") {
      return res.status(400).json({ message: "Comment text cannot be empty" });
    }

    // Create the comment object
    const newComment = {
      userId: req.user._id, // User who is commenting
      text: req.body.text,  // Comment content
      createdAt: new Date() // Timestamp
    };

    // Add the comment to the comments array
    post.comments.push(newComment);

    // Save the updated post
    await post.save();

    res.status(200).json({
      message: "Comment added successfully",
      comments: post.comments
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove a comment
router.post("/:postId/uncomment/:commentId", verifyToken, async (req, res) => {
  try {
    // Find the post by ID
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if the comment exists in the comments array
    const commentIndex = post.comments.findIndex(
      (comment) =>
        comment._id.toString() === req.params.commentId &&
        comment.userId.toString() === req.user._id
    );

    if (commentIndex === -1) {
      return res
        .status(400)
        .json({ message: "Comment not found or you are not authorized to delete it" });
    }

    // Remove the comment
    post.comments.splice(commentIndex, 1);

    // Save the updated post
    await post.save();

    res.status(200).json({ message: "Comment removed successfully", comments: post.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;