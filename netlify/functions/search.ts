import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'KB Method Not Allowed' };

    try {
        const { query } = JSON.parse(event.body || '{}');
        const apiKey = process.env.VITE_TAVILY_API_KEY || process.env.TAVILY_API_KEY;

        if (!apiKey) throw new Error('Missing Tavily API Key');

        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query,
                search_depth: 'basic',
                include_answer: true,
                max_results: 5
            })
        });

        const data = await response.json();

        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
