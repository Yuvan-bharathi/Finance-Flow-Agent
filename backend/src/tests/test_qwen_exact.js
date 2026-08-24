import { groq } from '../config/groq.config.js';
import { assistantToolsDeclaration } from '../tools/assistantTools.js';

async function testQwenExact() {
  try {
    console.log('Testing Qwen with assistant prompt...');
    const res = await groq.chat.completions.create({
      model: 'qwen/qwen3.6-27b',
      messages: [
        { role: 'system', content: 'You are FinanceFlow AI Copilot.' },
        { role: 'user', content: 'Tell me everything important about ABC Technologies Pvt Ltd.' }
      ],
      tools: assistantToolsDeclaration,
      tool_choice: 'auto'
    });
    console.log('✅ Qwen success:', res.choices[0]?.message);
  } catch (err) {
    console.log('❌ Qwen error message:', err.message);
    console.log('❌ Qwen error status:', err.status);
  }
  process.exit(0);
}

testQwenExact();
