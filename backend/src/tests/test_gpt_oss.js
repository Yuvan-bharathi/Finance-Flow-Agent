import { groq } from '../config/groq.config.js';
import { assistantToolsDeclaration } from '../tools/assistantTools.js';

async function testToolCalling(model) {
  try {
    console.log(`Testing tool calling with ${model}...`);
    const res = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a financial assistant. Call getPaymentDetails to find payment details.' },
        { role: 'user', content: 'Get details for payment 1' }
      ],
      tools: assistantToolsDeclaration,
      tool_choice: 'auto',
      temperature: 0.2
    });

    const msg = res.choices[0]?.message;
    console.log(`  Native tool calls for ${model}:`, msg.tool_calls);
    console.log(`  Content:`, msg.content);
  } catch (err) {
    console.error(`  Error for ${model}:`, err.message);
  }
}

async function run() {
  await testToolCalling('openai/gpt-oss-120b');
  await testToolCalling('openai/gpt-oss-20b');
  process.exit(0);
}

run();
