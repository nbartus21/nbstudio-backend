import cron from 'node-cron';
import socialMediaService from '../services/socialMediaService.js';

// Minden percben ellenőrizzük az ütemezett posztokat
cron.schedule('* * * * *', async () => {
  try {
    await socialMediaService.processScheduledPosts();
  } catch (error) {
    console.error('Hiba az ütemezett posztok feldolgozásakor:', error);
  }
});

export default {}; 