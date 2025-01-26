import mongoose from 'mongoose';

    const postSchema = new mongoose.Schema({
      title: {
        de: { type: String, required: true },
        en: { type: String, required: true },
        hu: { type: String, required: true }
      },
      content: {
        de: { type: String, required: true },
        en: { type: String, required: true },
        hu: { type: String, required: true }
      },
      excerpt: {
        de: { type: String, required: true },
        en: { type: String, required: true },
        hu: { type: String, required: true }
      },
      slug: { type: String, required: true, unique: true },
      tags: [String],
      published: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    export default mongoose.model('Post', postSchema);
