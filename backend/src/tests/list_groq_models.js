import { groq } from '../config/groq.config.js';

async function listModels() {
  try {
    const list = await groq.models.list();
    console.log('Available Groq models:');
    list.data.forEach(m => console.log(' - ', m.id));
  } catch (err) {
    console.error('List models error:', err);
  }
  process.exit(0);
}

listModels();
