import { groq } from '../config/groq.config.js';

async function testAllGroq() {
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen/qwen3.6-27b', 'openai/gpt-oss-120b'];
  for (const m of models) {
    const t0 = Date.now();
    try {
      const res = await groq.chat.completions.create({
        model: m,
        messages: [{ role: 'user', content: 'Say hello in 2 words.' }],
        max_tokens: 10
      });
      console.log(`[${Date.now() - t0}ms] ✅ ${m}:`, res.choices[0]?.message?.content?.trim());
    } catch (err) {
      console.log(`[${Date.now() - t0}ms] ❌ ${m}:`, err.message);
    }
  }
  process.exit(0);
}

testAllGroq();
