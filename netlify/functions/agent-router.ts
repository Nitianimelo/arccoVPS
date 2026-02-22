import { Handler } from '@netlify/functions';
import { callLLM } from './lib/llm';
import { supabaseAdmin } from './lib/supabase-admin';

// Simple in-memory kw map (can be moved to DB caching later)
const KEYWORD_PATTERNS: Record<string, RegExp> = {
    web_search: /\b(pesquis|busc|procur|encontr|search|google|internet|quem é|o que é)\w*/i,
    ocr_scan: /\b(leia|ler|extrair|texto da imagem|scan|ocr)\w*/i,
    generate_file: /\b(gera|cri)\w*\s+(pdf|documento|relatório|report|slide|apresentação|pptx|planilha|excel|xlsx|word|docx)/i,
    deep_search: /\b(pesquisa profunda|deep search|relatório completo|investiga)\w*/i,
};

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'JF Method Not Allowed' };

    try {
        const { message, conversation_id, user_id } = JSON.parse(event.body || '{}');

        if (!message || !user_id) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing message or user_id' }) };
        }

        // 1. Keyword Matching (Zero Token)
        let intent = matchKeywords(message);
        let confidence = intent ? 1.0 : 0.0;

        // 2. LLM Classification (if no keyword)
        if (!intent) {
            const classification = await classifyWithLLM(message);
            intent = classification.intent;
            confidence = 0.8; // Assume reliable enough
        }

        // 3. Dispatch
        // For now, we return the plan/intent to the client, and the client calls the specific action endpoint 
        // OR triggers the next step. 
        // BETTER: This router should probably return the "Next Step" immediately.

        // If exact action is found suitable for immediate execution (Deterministic)
        if (intent === 'web_search' || intent === 'generate_file' || intent === 'ocr_scan') {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    type: 'action',
                    intent,
                    confidence,
                    payload: { message } // Pass original message for param extraction in the specific handler
                })
            };
        }

        // Fallback or complex intent -> Reasoning/Planner
        return {
            statusCode: 200,
            body: JSON.stringify({
                type: 'reasoning',
                intent: intent || 'general_chat',
                confidence
            })
        };

    } catch (error: any) {
        console.error('Router Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

function matchKeywords(message: string): string | null {
    for (const [intent, pattern] of Object.entries(KEYWORD_PATTERNS)) {
        if (pattern.test(message)) return intent;
    }
    return null;
}

async function classifyWithLLM(message: string) {
    const result = await callLLM({
        messages: [{
            role: 'user',
            content: `Classify intent: web_search, generate_file, ocr_scan, deep_search, general_chat.\nMessage: "${message}"\nReturn ONLY the intent intent.`
        }],
        max_tokens: 20
    });
    return { intent: result?.trim().toLowerCase() || 'general_chat' };
}
