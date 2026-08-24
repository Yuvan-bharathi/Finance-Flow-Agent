import { groq } from '../config/groq.config.js';

async function testAvailableModels() {
  const models = ['groq/compound-mini', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'groq/compound'];
  for (const m of models) {
    try {
      console.log(`\nTesting model: ${m}...`);
      const res = await groq.chat.completions.create({
        model: m,
        messages: [{ role: 'user', content: 'Say "FinanceFlow AI ready" in 3 words.' }],
        max_tokens: 20
      });
      console.log(`✅ Success on ${m}:`, res.choices[0]?.message?.content);
    } catch (err) {
      console.log(`❌ Failed on ${m}:`, err.message);
    }
  }
  process.exit(0);
}

testAvailableModels();
