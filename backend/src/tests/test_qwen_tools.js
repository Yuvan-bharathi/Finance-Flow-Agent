import { groq } from '../config/groq.config.js';
import { assistantToolsDeclaration } from '../tools/assistantTools.js';

async function testQwenTools() {
  try {
    console.log('Testing tool calling with qwen/qwen3.6-27b...');
    const res = await groq.chat.completions.create({
      model: 'qwen/qwen3.6-27b',
      messages: [
        { role: 'system', content: 'You are FinanceFlow AI Copilot. Call getCompanyProfile if asked about a company.' },
        { role: 'user', content: 'Investigate ABC Technologies (company ID 1)' }
      ],
      tools: assistantToolsDeclaration,
      tool_choice: 'auto'
    });

    const msg = res.choices[0]?.message;
    console.log('Message tool_calls:', msg?.tool_calls);
    console.log('Message content:', msg?.content?.slice(0, 200));
  } catch (err) {
    console.error('Qwen tool error:', err.message);
  }
  process.exit(0);
}

testQwenTools();
