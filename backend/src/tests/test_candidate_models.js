import { groq } from '../config/groq.config.js';

const modelsToTest = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'groq/compound',
  'qwen/qwen3.6-27b'
];

async function testAll() {
  for (const m of modelsToTest) {
    try {
      console.log(`Testing model: ${m}...`);
      const res = await groq.chat.completions.create({
        model: m,
        messages: [{ role: 'user', content: 'Say hello in 5 words.' }],
        temperature: 0.2
      });
      console.log(`  ✅ ${m} responded:`, res.choices[0]?.message?.content);
    } catch (err) {
      console.log(`  ❌ ${m} failed:`, err.message);
    }
  }
  process.exit(0);
}

testAll();
