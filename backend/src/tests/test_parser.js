const parseArgsString = (str = '') => {
  str = str.trim();
  if (!str) return {};
  if (str.startsWith('{') && str.endsWith('}')) {
    try { return JSON.parse(str); } catch {}
  }
  const args = {};
  const kvRegex = /([a-zA-Z0-9_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^,)\s]+))/g;
  let match;
  let matchedAny = false;
  while ((match = kvRegex.exec(str)) !== null) {
    matchedAny = true;
    const key = match[1];
    const val = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : match[4]);
    if (!isNaN(val) && val.trim() !== '') {
      args[key] = Number(val);
    } else if (val === 'true') {
      args[key] = true;
    } else if (val === 'false') {
      args[key] = false;
    } else {
      args[key] = val;
    }
  }
  if (!matchedAny && str.length > 0) {
    const cleaned = str.replace(/^['"]|['"]$/g, '').trim();
    if (!isNaN(cleaned) && cleaned !== '') {
      args.id = Number(cleaned);
      args.runId = Number(cleaned);
      args.caseId = Number(cleaned);
    } else {
      args.query = cleaned;
    }
  }
  return args;
};

const parseTextToolCalls = (content = '') => {
  if (!content) return [];
  const calls = [];

  // Pattern 1: function style `fnName(arg=val)`
  const fnRegex = /(?:<tool_call>|```tool_call)?\s*([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)(?:\s*<\/tool_call>|\s*```)?/gi;
  let fnMatch;
  while ((fnMatch = fnRegex.exec(content)) !== null) {
    const fnName = fnMatch[1];
    if (fnName && fnName !== 'function' && fnName !== 'tool_call') {
      const args = parseArgsString(fnMatch[2]);
      calls.push({ name: fnName, args });
    }
  }

  // Pattern 2: XML parameter format
  const xmlRegex = /<tool_call>[\s\S]*?<function=([a-zA-Z0-9_]+)>([\s\S]*?)<\/function>[\s\S]*?(?:<\/tool_call>|$)/gi;
  let xMatch;
  while ((xMatch = xmlRegex.exec(content)) !== null) {
    const fnName = xMatch[1];
    const paramsBlock = xMatch[2];
    const paramRegex = /<parameter=([a-zA-Z0-9_]+)>([\s\S]*?)<\/parameter>/gi;
    const args = {};
    let pMatch;
    while ((pMatch = paramRegex.exec(paramsBlock)) !== null) {
      args[pMatch[1]] = pMatch[2].trim();
    }
    calls.push({ name: fnName, args });
  }

  // Pattern 3: JSON format
  const jsonRegex = /(?:<tool_call>|```(?:json|tool_call)?)\s*(\{[\s\S]*?\})\s*(?:<\/tool_call>|```|$)/gi;
  let jMatch;
  while ((jMatch = jsonRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(jMatch[1]);
      if (parsed.name) {
        calls.push({ name: parsed.name, args: parsed.arguments || parsed.parameters || {} });
      }
    } catch {}
  }

  const seen = new Set();
  return calls.filter(c => {
    const key = `${c.name}:${JSON.stringify(c.args)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

console.log('Test 1 (User screenshot):', parseTextToolCalls('<tool_call>\ngetAgentExecutionLogs(runId=1)'));
console.log('Test 2 (Closing tag):', parseTextToolCalls('<tool_call>\ngetAgentExecutionLogs(runId=1)\n</tool_call>'));
console.log('Test 3 (XML):', parseTextToolCalls('<tool_call>\n<function=searchCompanyByName>\n<parameter=query>XYZ Solutions</parameter>\n</function>\n</tool_call>'));
console.log('Test 4 (JSON):', parseTextToolCalls('<tool_call>\n{"name": "searchCompanyByName", "arguments": {"query": "XYZ Solutions"}}\n</tool_call>'));
