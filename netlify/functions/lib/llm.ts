interface LLMRequest {
    system?: string;
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
    max_tokens?: number;
    temperature?: number;
}

import { supabaseAdmin } from './supabase-admin';

export async function callLLM(request: LLMRequest) {
    let apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        // Fallback: Fetch from Supabase DB
        const { data } = await supabaseAdmin
            .from('ApiKeys') // Try CamelCase first
            .select('api_key')
            .eq('provider', 'openrouter')
            .eq('is_active', true)
            .maybeSingle();

        if (data?.api_key) {
            apiKey = data.api_key;
        } else {
            // Try lowercase 'apikeys'
            const { data: dataLower } = await supabaseAdmin
                .from('apikeys')
                .select('api_key')
                .eq('provider', 'openrouter')
                .eq('is_active', true)
                .maybeSingle();

            if (dataLower?.api_key) apiKey = dataLower.api_key;
        }
    }

    if (!apiKey) {
        console.error("CRITICAL: OPENROUTER_API_KEY not found in ENV or DB.");
        throw new Error('OPENROUTER_API_KEY not set in environment variables or database.');
    }

    // Pre-process messages to handle [IMAGE_URL: ...]
    // Support Vision calls
    const processedMessages = request.messages.map(msg => {
        const imageMatch = msg.content.match(/\[IMAGE_URL:\s*(https?:\/\/[^\]]+)\]/);
        if (imageMatch) {
            const imageUrl = imageMatch[1];
            const textContent = msg.content.replace(imageMatch[0], '').trim();
            return {
                role: msg.role,
                content: [
                    { type: 'text', text: textContent || "Analyze this image." },
                    { type: 'image_url', image_url: { url: imageUrl } }
                ]
            };
        }
        return msg;
    });

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://arcco.ai',
            'X-Title': 'Arcco.ai Agent',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'anthropic/claude-3.5-sonnet', // Supports Vision
            messages: [
                ...(request.system ? [{ role: 'system', content: request.system }] : []),
                ...processedMessages
            ],
            max_tokens: request.max_tokens || 2048,
            temperature: request.temperature || 0.7
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM API Error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}
