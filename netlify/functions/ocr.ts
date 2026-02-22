import { Handler } from '@netlify/functions';
import { createWorker } from 'tesseract.js';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const { image_url } = JSON.parse(event.body || '{}');

        if (!image_url) {
            return { statusCode: 400, body: 'Missing image_url' };
        }

        const worker = await createWorker('eng'); // Default to English for now, can param
        const ret = await worker.recognize(image_url);
        await worker.terminate();

        return {
            statusCode: 200,
            body: JSON.stringify({
                text: ret.data.text,
                confidence: ret.data.confidence
            })
        };

    } catch (error: any) {
        console.error('OCR Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
