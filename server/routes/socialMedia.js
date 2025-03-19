import express from 'express';
import { body, validationResult } from 'express-validator';
import socialMediaService from '../services/socialMediaService.js';
import { SocialMediaSettings, ScheduledPost } from '../models/SocialMedia.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Facebook hitelesítési URL lekérése
router.get('/auth/facebook/url', auth, async (req, res) => {
  try {
    const url = socialMediaService.getFacebookAuthUrl(
      process.env.FACEBOOK_APP_ID,
      `${process.env.APP_URL}/api/social-media/auth/facebook/callback`
    );
    res.json({ url });
  } catch (error) {
    console.error('Hiba a Facebook auth URL generálásakor:', error);
    res.status(500).json({ error: 'Hiba történt a Facebook hitelesítési URL generálásakor' });
  }
});

// Facebook callback kezelése
router.get('/auth/facebook/callback', auth, async (req, res) => {
  try {
    const { code } = req.query;
    
    const accessToken = await socialMediaService.getFacebookAccessToken(
      process.env.FACEBOOK_APP_ID,
      process.env.FACEBOOK_APP_SECRET,
      code,
      `${process.env.APP_URL}/api/social-media/auth/facebook/callback`
    );

    // Facebook oldalak lekérése
    const pages = await socialMediaService.getFacebookPages(accessToken);
    
    // Beállítások mentése minden oldalhoz
    let settings = await SocialMediaSettings.findOne({ userId: req.user.id });
    if (!settings) {
      settings = new SocialMediaSettings({ userId: req.user.id, accounts: [] });
    }

    for (const page of pages) {
      // Instagram fiók keresése az oldalhoz
      const igAccount = await socialMediaService.getInstagramAccount(page.id, page.access_token);
      
      // Facebook oldal hozzáadása
      const fbAccountIndex = settings.accounts.findIndex(
        acc => acc.platform === 'facebook' && acc.accountId === page.id
      );
      
      if (fbAccountIndex >= 0) {
        settings.accounts[fbAccountIndex] = {
          platform: 'facebook',
          accountId: page.id,
          accessToken: page.access_token,
          name: page.name,
          profilePicture: page.picture?.data?.url,
          isConnected: true,
          lastTokenRefresh: new Date()
        };
      } else {
        settings.accounts.push({
          platform: 'facebook',
          accountId: page.id,
          accessToken: page.access_token,
          name: page.name,
          profilePicture: page.picture?.data?.url,
          isConnected: true,
          lastTokenRefresh: new Date()
        });
      }

      // Instagram fiók hozzáadása ha van
      if (igAccount) {
        const igAccountIndex = settings.accounts.findIndex(
          acc => acc.platform === 'instagram' && acc.accountId === igAccount.id
        );
        
        if (igAccountIndex >= 0) {
          settings.accounts[igAccountIndex] = {
            platform: 'instagram',
            accountId: igAccount.id,
            accessToken: page.access_token,
            name: page.name,
            profilePicture: page.picture?.data?.url,
            isConnected: true,
            lastTokenRefresh: new Date()
          };
        } else {
          settings.accounts.push({
            platform: 'instagram',
            accountId: igAccount.id,
            accessToken: page.access_token,
            name: page.name,
            profilePicture: page.picture?.data?.url,
            isConnected: true,
            lastTokenRefresh: new Date()
          });
        }
      }
    }

    await settings.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Hiba a Facebook callback feldolgozásakor:', error);
    res.status(500).json({ error: 'Hiba történt a Facebook hitelesítés során' });
  }
});

// Fiók beállítások lekérése
router.get('/settings', auth, async (req, res) => {
  try {
    const settings = await SocialMediaSettings.findOne({ userId: req.user.id });
    res.json(settings || { accounts: [] });
  } catch (error) {
    console.error('Hiba a beállítások lekérésekor:', error);
    res.status(500).json({ error: 'Hiba történt a beállítások lekérésekor' });
  }
});

// Poszt ütemezése
router.post('/posts', [
  auth,
  body('content').notEmpty().withMessage('A tartalom megadása kötelező'),
  body('platforms').isArray().withMessage('Legalább egy platform kiválasztása kötelező'),
  body('scheduledFor').isISO8601().withMessage('Érvényes dátum megadása kötelező')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, platforms, scheduledFor, media } = req.body;

    const post = new ScheduledPost({
      userId: req.user.id,
      content,
      platforms,
      scheduledFor: new Date(scheduledFor),
      media: media || [],
      status: 'scheduled'
    });

    await post.save();
    res.json(post);
  } catch (error) {
    console.error('Hiba a poszt ütemezésekor:', error);
    res.status(500).json({ error: 'Hiba történt a poszt ütemezése során' });
  }
});

// Ütemezett posztok lekérése
router.get('/posts', auth, async (req, res) => {
  try {
    const posts = await ScheduledPost.find({ userId: req.user.id })
      .sort({ scheduledFor: -1 });
    res.json(posts);
  } catch (error) {
    console.error('Hiba a posztok lekérésekor:', error);
    res.status(500).json({ error: 'Hiba történt a posztok lekérése során' });
  }
});

// Ütemezett poszt törlése
router.delete('/posts/:id', auth, async (req, res) => {
  try {
    const post = await ScheduledPost.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!post) {
      return res.status(404).json({ error: 'A poszt nem található' });
    }

    if (post.status === 'published') {
      return res.status(400).json({ error: 'Már közzétett poszt nem törölhető' });
    }

    await post.remove();
    res.json({ success: true });
  } catch (error) {
    console.error('Hiba a poszt törlésekor:', error);
    res.status(500).json({ error: 'Hiba történt a poszt törlése során' });
  }
});

export default router; 