import axios from 'axios';
import { SocialMediaSettings, ScheduledPost } from '../models/SocialMedia.js';

class SocialMediaService {
  constructor() {
    this.fbApiVersion = 'v18.0';
    this.fbApiBaseUrl = `https://graph.facebook.com/${this.fbApiVersion}`;
  }

  // Facebook hitelesítési URL generálása
  getFacebookAuthUrl(clientId, redirectUri) {
    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_manage_metadata',
      'instagram_basic',
      'instagram_content_publish'
    ].join(',');

    return `https://www.facebook.com/${this.fbApiVersion}/dialog/oauth?` +
           `client_id=${clientId}&` +
           `redirect_uri=${encodeURIComponent(redirectUri)}&` +
           `scope=${encodeURIComponent(scopes)}&` +
           `response_type=code`;
  }

  // Access token beszerzése a Facebook kódból
  async getFacebookAccessToken(clientId, clientSecret, code, redirectUri) {
    try {
      const response = await axios.get(`${this.fbApiBaseUrl}/oauth/access_token`, {
        params: {
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Hiba a Facebook access token beszerzésekor:', error);
      throw error;
    }
  }

  // Facebook oldalak lekérése
  async getFacebookPages(accessToken) {
    try {
      const response = await axios.get(`${this.fbApiBaseUrl}/me/accounts`, {
        params: { access_token: accessToken }
      });

      return response.data.data;
    } catch (error) {
      console.error('Hiba a Facebook oldalak lekérésekor:', error);
      throw error;
    }
  }

  // Instagram Business Account lekérése Facebook oldalhoz
  async getInstagramAccount(pageId, pageAccessToken) {
    try {
      const response = await axios.get(`${this.fbApiBaseUrl}/${pageId}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: pageAccessToken
        }
      });

      return response.data.instagram_business_account;
    } catch (error) {
      console.error('Hiba az Instagram fiók lekérésekor:', error);
      throw error;
    }
  }

  // Poszt ütemezése Facebookra
  async schedulePostToFacebook(pageId, pageAccessToken, post) {
    try {
      const postData = {
        message: post.content,
        scheduled_publish_time: Math.floor(post.scheduledFor.getTime() / 1000)
      };

      // Ha van média, hozzáadjuk
      if (post.media && post.media.length > 0) {
        // Kép feltöltése a Facebook szerverére
        const mediaResponse = await axios.post(
          `${this.fbApiBaseUrl}/${pageId}/photos`,
          {
            url: post.media[0],
            published: false
          },
          {
            params: { access_token: pageAccessToken }
          }
        );

        postData.attached_media = [{
          media_fbid: mediaResponse.data.id
        }];
      }

      const response = await axios.post(
        `${this.fbApiBaseUrl}/${pageId}/feed`,
        postData,
        {
          params: { access_token: pageAccessToken }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Hiba a Facebook poszt ütemezésekor:', error);
      throw error;
    }
  }

  // Poszt ütemezése Instagramra
  async schedulePostToInstagram(igAccountId, pageAccessToken, post) {
    try {
      // Instagram container létrehozása
      const containerResponse = await axios.post(
        `${this.fbApiBaseUrl}/${igAccountId}/media`,
        {
          image_url: post.media[0],
          caption: post.content,
          access_token: pageAccessToken
        }
      );

      // Poszt ütemezése
      const response = await axios.post(
        `${this.fbApiBaseUrl}/${igAccountId}/media_publish`,
        {
          creation_id: containerResponse.data.id
        },
        {
          params: { access_token: pageAccessToken }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Hiba az Instagram poszt ütemezésekor:', error);
      throw error;
    }
  }

  // Ütemezett posztok ellenőrzése és közzététele
  async processScheduledPosts() {
    try {
      const now = new Date();
      const posts = await ScheduledPost.find({
        status: 'scheduled',
        scheduledFor: { $lte: now }
      }).populate('userId');

      for (const post of posts) {
        try {
          const settings = await SocialMediaSettings.findOne({ userId: post.userId });
          
          for (const platform of post.platforms) {
            const account = settings.accounts.find(acc => acc.platform === platform);
            
            if (account) {
              if (platform === 'facebook') {
                await this.schedulePostToFacebook(account.accountId, account.accessToken, post);
              } else if (platform === 'instagram') {
                await this.schedulePostToInstagram(account.accountId, account.accessToken, post);
              }
            }
          }

          post.status = 'published';
          post.publishedAt = now;
          await post.save();
        } catch (error) {
          post.status = 'failed';
          post.errorMessage = error.message;
          await post.save();
          console.error(`Hiba a poszt közzétételekor (ID: ${post._id}):`, error);
        }
      }
    } catch (error) {
      console.error('Hiba az ütemezett posztok feldolgozásakor:', error);
      throw error;
    }
  }
}

export default new SocialMediaService(); 