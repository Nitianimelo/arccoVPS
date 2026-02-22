import { Handler } from '@netlify/functions';
import PptxGenJS from 'pptxgenjs';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { jsPDF } from 'jspdf';
import { supabaseAdmin } from './lib/supabase-admin';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const { type, content, title } = JSON.parse(event.body || '{}');
        let buffer: Buffer | ArrayBuffer | Uint8Array;
        let mimeType: string;
        let extension: string;

        if (type === 'pptx') {
            const pptx = new PptxGenJS();
            const slide = pptx.addSlide();
            slide.addText(title, { x: 1, y: 1, fontSize: 24 });
            slide.addText(content, { x: 1, y: 2, fontSize: 14 });
            // @ts-ignore - write returns promise in node
            buffer = await pptx.write({ outputType: 'nodebuffer' });
            mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
            extension = 'pptx';
        } else if (type === 'docx') {
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 48 })] }),
                        new Paragraph({ children: [new TextRun({ text: content, size: 24 })] }),
                    ],
                }],
            });
            buffer = await Packer.toBuffer(doc);
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            extension = 'docx';
        } else if (type === 'pdf') {
            // Basic PDF gen
            const doc = new jsPDF();
            doc.text(title, 10, 10);
            const splitText = doc.splitTextToSize(content, 180);
            doc.text(splitText, 10, 20);
            buffer = Buffer.from(doc.output('arraybuffer'));
            mimeType = 'application/pdf';
            extension = 'pdf';
        } else {
            return { statusCode: 400, body: 'Invalid file type' };
        }

        // Upload to Supabase
        const fileName = `${Date.now()}-${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`;
        const { data, error } = await supabaseAdmin.storage
            .from('generated-files')
            .upload(fileName, buffer, {
                contentType: mimeType,
            });

        if (error) throw error;

        // Get Public URL
        const { data: publicUrlData } = supabaseAdmin.storage
            .from('generated-files')
            .getPublicUrl(fileName);

        return {
            statusCode: 200,
            body: JSON.stringify({
                url: publicUrlData.publicUrl,
                message: `${type.toUpperCase()} generated successfully.`
            })
        };

    } catch (error: any) {
        console.error('File Gen Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
