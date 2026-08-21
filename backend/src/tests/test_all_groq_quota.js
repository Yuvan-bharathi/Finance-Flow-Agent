import { groq } from '../config/groq.config.js';

async function testAll() {
  const list = await groq.models.list();
  for (const m of list.data) {
    if (m.id.includes('whisper') || m.id.includes('guard')) continue;
    try {
      const res = await groq.chat.completions.create({
        model: m.id,
        messages: [{ role: 'user', content: 'Say "OK"' }],
        max_tokens: 5
      });
      console.log(`✅ ${m.id} is WORKING:`, res.choices[0]?.message?.content?.trim());
    } catch (err) {
      console.log(`❌ ${m.id} failed:`, err.message);
    }
  }
  process.exit(0);
}

testAll();
