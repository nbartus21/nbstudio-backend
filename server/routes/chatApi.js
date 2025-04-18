// routes/chatApi.js
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import authMiddleware from '../middleware/auth.js';
// import { callDeepSeekAPI } from '../../src/deepseekService.js';

const router = express.Router();

// Define Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  role: { 
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Define Chat Conversation Schema
const chatConversationSchema = new mongoose.Schema({
  userId: { 
    type: String,
    required: true 
  },
  title: String,
  messages: [chatMessageSchema],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Create model if not exists
let ChatConversation;
try {
  ChatConversation = mongoose.model('ChatConversation');
} catch (error) {
  ChatConversation = mongoose.model('ChatConversation', chatConversationSchema);
}

// ----- Public endpoint for chat without authentication -----
router.post('/', async (req, res) => {
  try {
    console.log('Public chat API kérés érkezett:', {
      body: req.body,
      headers: {
        auth: req.headers.authorization ? 'Van' : 'Nincs',
        'x-api-key': req.headers['x-api-key'] ? 'Van' : 'Nincs'
      }
    });
    
    const { messages, conversationId } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Érvénytelen kérés formátum' });
    }
    
    // Call DeepSeek API
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-a781f0251b034cf6b91f970b43d9caa5';
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
    
    console.log('DeepSeek API hívás:', { 
      url: DEEPSEEK_API_URL,
      messages: messages.map(m => ({ role: m.role, content: m.content.substring(0, 50) + '...' }))
    });
    
    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: messages,
          stream: false
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('DeepSeek API hiba:', errorData);
        return res.status(response.status).json({ 
          message: 'Hiba az AI szolgáltatásnál',
          error: errorData 
        });
      }
      
      const data = await response.json();
      console.log('DeepSeek API válasz:', { 
        status: response.status,
        hasChoices: !!data.choices,
        firstChoice: data.choices && data.choices.length > 0 ? 'Van' : 'Nincs'
      });
      
      // Sikeres válasz
      res.json(data);
    } catch (fetchError) {
      console.error('Hiba a DeepSeek API hívása során:', fetchError);
      return res.status(500).json({ 
        message: 'Hiba az AI szolgáltatásnál',
        error: fetchError.message 
      });
    }
    
  } catch (error) {
    console.error('Chat API hiba:', error);
    res.status(500).json({ 
      message: 'Szerverhiba a chat kérés feldolgozása során',
      error: error.message 
    });
  }
});

// ----- Protected endpoints (require authentication) -----
router.use(authMiddleware);

// Get all conversations for the user
router.get('/chat/conversations', async (req, res) => {
  try {
    const conversations = await ChatConversation.find({ 
      userId: req.userData.email 
    })
    .select('title createdAt updatedAt')
    .sort({ updatedAt: -1 });
    
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a specific conversation
router.get('/chat/conversations/:id', async (req, res) => {
  try {
    const conversation = await ChatConversation.findOne({ 
      _id: req.params.id,
      userId: req.userData.email 
    });
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create or update a conversation
router.post('/chat/conversations', async (req, res) => {
  try {
    const { id, title, messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages are required and must be an array' });
    }
    
    let conversation;
    
    if (id) {
      // Update existing conversation
      conversation = await ChatConversation.findOne({ 
        _id: id,
        userId: req.userData.email 
      });
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      conversation.messages = messages;
      conversation.updatedAt = new Date();
      if (title) conversation.title = title;
      
    } else {
      // Create new conversation
      conversation = new ChatConversation({
        userId: req.userData.email,
        title: title || 'New Conversation',
        messages
      });
    }
    
    await conversation.save();
    res.status(id ? 200 : 201).json(conversation);
    
  } catch (error) {
    console.error('Error saving conversation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a conversation
router.delete('/chat/conversations/:id', async (req, res) => {
  try {
    const result = await ChatConversation.findOneAndDelete({ 
      _id: req.params.id,
      userId: req.userData.email 
    });
    
    if (!result) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Chat with AI (authenticated)
router.post('/chat', async (req, res) => {
  try {
    const { messages, conversationId } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Érvénytelen kérés formátum' });
    }
    
    // Call DeepSeek API
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-a781f0251b034cf6b91f970b43d9caa5';
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
    
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: messages,
        stream: false
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('DeepSeek API hiba:', errorData);
      return res.status(response.status).json({ 
        message: 'Hiba az AI szolgáltatásnál',
        error: errorData 
      });
    }
    
    const data = await response.json();
    
    // Save to database if user is logged in - token from Authorization header
    // vagy a kérés query-ből - ellenőrizzük mindkét lehetőséget
    if (req.headers.authorization || (req.userData && req.userData.email)) {
      try {
        let userId = null;
        
        // Ha van userData (a middleware által dekódolt token), akkor az email-t használjuk
        if (req.userData && req.userData.email) {
          userId = req.userData.email;
        } 
        // Ha nincs userData, de van authorization header, akkor megpróbáljuk dekódolni
        else if (req.headers.authorization) {
          try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nb_studio_default_secret_key');
            userId = decoded.email;
          } catch (tokenError) {
            console.error('Token dekódolási hiba:', tokenError);
          }
        }
        
        // Ha sikerült azonosítani a felhasználót, elmentsük a beszélgetést
        if (userId) {
          console.log('Beszélgetés mentése felhasználónak:', userId);
          
          // Add new message to stored messages
          const allMessages = [
            ...messages,
            {
              role: 'assistant',
              content: data.choices[0].message.content
            }
          ];
          
          // If conversation ID is provided, update that conversation
          if (conversationId) {
            await ChatConversation.findOneAndUpdate(
              { _id: conversationId, userId: userId },
              { 
                messages: allMessages,
                updatedAt: new Date()
              }
            );
          } else {
            // Create a new conversation
            const title = messages[0]?.content.slice(0, 30) + (messages[0]?.content.length > 30 ? '...' : '');
            
            const conversation = new ChatConversation({
              userId: userId,
              title,
              messages: allMessages
            });
            
            await conversation.save();
            data.conversationId = conversation._id;
          }
        }
      } catch (dbError) {
        console.error('Hiba a beszélgetés adatbázisba mentésekor:', dbError);
        // Continue sending response even if DB save fails
      }
    } else {
      console.log('Nincs bejelentkezett felhasználó, nem mentjük a beszélgetést');
    }
    
    res.json(data);
    
  } catch (error) {
    console.error('Chat API hiba:', error);
    res.status(500).json({ 
      message: 'Szerverhiba a chat kérés feldolgozása során',
      error: error.message 
    });
  }
});

export default router;