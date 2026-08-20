import { Groq } from 'groq-sdk';
import { config } from './env.js';

/**
 * Module: Config / Groq API Setup
 * Purpose: Initializes the Groq API SDK client instance for AI Agent inference.
 * 
 * Called by:
 * - backend/src/agents/reconciliationAgent.js
 * 
 * Data flow:
 * process.env.GROQ_API_KEY ➔ Groq Client ➔ LLM Tool Calling Inference
 */

if (!config.groq.apiKey) {
  console.warn('[Groq Config Warning] GROQ_API_KEY is not set in environment variables. Mocking or fallback mode will be required if API key is invalid.');
}

export const groq = new Groq({
  apiKey: config.groq.apiKey || 'gsk_placeholder_key'
});

export const GROQ_MODEL = config.groq.model || 'llama-3.3-70b-versatile';
