import express from 'express';
import Post from '../models/Post.js';

const router = express.Router();

// Get all posts
router.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    console.log('Fetched posts:', posts);
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create post
router.post('/posts', async (req, res) => {
  try {
    const post = new Post(req.body);
    const savedPost = await post.save();
    console.log('Created post:', savedPost);
    res.status(201).json(savedPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update post
router.put('/posts/:id', async (req, res) => {
  try {
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    console.log('Updated post:', updatedPost);
    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete post
router.delete('/posts/:id', async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
