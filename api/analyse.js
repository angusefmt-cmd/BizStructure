// ============================================================
// api/analyse.js — Vercel Serverless Function
// Calls Claude API securely (API key stays on server only)
// ============================================================

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on server.' });

  const { desc, bizName, industry, size, age, goal, challenge } = req.body || {};

  if (!desc || desc.trim().length < 10) {
    return res.status(400).json({ error: 'Business description is required.' });
  }

  const prompt = `You are BizStructure AI — a world-class business systemisation consultant. Analyse the business below and return ONLY a JSON object with the exact structure shown. No markdown, no backticks, no preamble — raw JSON only.

BUSINESS INPUT:
Name: ${bizName || 'Not provided'}
Industry: ${industry || 'Not provided'}
Team size: ${size || 'Not provided'}
Business age: ${age || 'Not provided'}
Main growth goal: ${goal || 'Not provided'}
Biggest challenge: ${challenge || 'Not provided'}
Description: ${desc}

RETURN THIS JSON STRUCTURE EXACTLY:
{
  "businessName": "Inferred or provided business name",
  "tagline": "One crisp sentence describing what this business does",
  "scalabilityScore": 0-100,
  "systemScore": 0-100,
  "bottleneck": "The single biggest thing holding this business back from scaling — be specific to their situation (2-3 sentences)",
  "coreFunctions": [
    {
      "name": "Function name (e.g. Operations, Sales, Marketing, Finance, HR, Customer Service)",
      "description": "How this function currently operates in their specific business — what's working, what's missing",
      "status": "gap | weak | ok"
    }
  ],
  "keyProcesses": [
    {
      "name": "Process name",
      "description": "Why this process needs to be documented and how to systemise it for their business",
      "priority": "high | medium | low"
    }
  ],
  "roles": [
    {
      "title": "Role title",
      "responsibility": "Core responsibility this role would own in their business",
      "urgency": "hire now | delegate | future"
    }
  ],
  "scalingLevers": [
    {
      "lever": "Lever name",
      "action": "Specific, concrete action for their business to activate this lever"
    }
  ],
  "quickWins": [
    "Specific action they can take this week — must be concrete and achievable",
    "Another specific quick win",
    "Another specific quick win"
  ],
  "roadmap": [
    {
      "milestone": "Month 1 milestone title",
      "actions": "2-3 specific actions to take in month 1"
    },
    {
      "milestone": "Month 2 milestone title",
      "actions": "2-3 specific actions to take in month 2"
    },
    {
      "milestone": "Month 3 milestone title",
      "actions": "2-3 specific actions to take in month 3"
    }
  ]
}

RULES:
- coreFunctions: include 5-6 items relevant to their business
- keyProcesses: include 5 items, most critical first
- roles: include 4 items, most urgent first
- scalingLevers: include 4 items
- quickWins: include exactly 3 items
- roadmap: include exactly 3 months
- Be highly specific to THEIR business — not generic advice
- scalabilityScore and systemScore should honestly reflect their current state (most small businesses score 20-50)
- Return ONLY the JSON object`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return res.status(502).json({ error: 'AI service error. Please try again.' });
    }

    const data = await response.json();
    const text = data.content.map(c => c.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();

    let result;
    try {
      result = JSON.parse(clean);
    } catch {
      console.error('JSON parse error, raw:', clean.slice(0, 500));
      return res.status(502).json({ error: 'Could not parse AI response. Please try again.' });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Function error:', err);
    return res.status(500).json({ error: 'Unexpected server error. Please try again.' });
  }
}
