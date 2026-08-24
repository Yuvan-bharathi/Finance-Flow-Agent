import { groq } from '../config/groq.config.js';
import { assistantToolsDeclaration } from '../tools/assistantTools.js';

async function testWorkingModels() {
  const models = ['allam-2-7b', 'groq/compound-mini', 'groq/compound'];
  for (const m of models) {
    try {
      console.log(`\nTesting tool calling with ${m}...`);
      const res = await groq.chat.completions.create({
        model: m,
        messages: [{ role: 'user', content: 'What is the profile for company ID 1?' }],
        tools: assistantToolsDeclaration,
        tool_choice: 'auto'
      });
      console.log(`✅ ${m} tool_calls:`, res.choices[0]?.message?.tool_calls);
      console.log(`✅ ${m} content:`, res.choices[0]?.message?.content);
    } catch (err) {
      console.log(`❌ ${m} failed:`, err.message);
    }
  }
  process.exit(0);
}

testWorkingModels();
