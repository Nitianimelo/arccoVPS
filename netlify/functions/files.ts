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

            // Split by SLIDE: marker
            const slidesContent = content.split(/SLIDE:/i).filter((s: string) => s.trim().length > 0);

            if (slidesContent.length === 0) {
                // Fallback if no markers
                const slide = pptx.addSlide();
                slide.addText(title, { x: 1, y: 1, fontSize: 24, bold: true });
                slide.addText(content, { x: 1, y: 2, fontSize: 14 });
            } else {
                slidesContent.forEach((slideText: string) => {
                    const lines = slideText.trim().split('\n');
                    const slideTitle = lines[0].replace(/[*#]/g, '').trim(); // First line is title
                    const slideBody = lines.slice(1).join('\n').trim();

                    const slide = pptx.addSlide();
                    slide.addText(slideTitle, { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '363636' });
                    slide.addText(slideBody, { x: 0.5, y: 1.5, fontSize: 14, color: '666666', w: '90%' });
                });
            }

            // @ts-ignore
            buffer = await pptx.write({ outputType: 'nodebuffer' });
            mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
            extension = 'pptx';
        } else if (type === 'docx') {
            const children: any[] = [
                new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 48 })] }),
                new Paragraph({ text: "" }) // Spacer
            ];

            const lines = content.split('\n');
            lines.forEach((line: string) => {
                const trimmed = line.trim();
                if (trimmed.startsWith('# ')) {
                    children.push(new Paragraph({
                        children: [new TextRun({ text: trimmed.replace('# ', ''), bold: true, size: 32 })],
                        spacing: { before: 200 }
                    }));
                } else if (trimmed.startsWith('## ')) {
                    children.push(new Paragraph({
                        children: [new TextRun({ text: trimmed.replace('## ', ''), bold: true, size: 28 })],
                        spacing: { before: 150 }
                    }));
                } else if (trimmed.length > 0) {
                    children.push(new Paragraph({
                        children: [new TextRun({ text: trimmed, size: 24 })]
                    }));
                }
            });

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: children,
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
        } else if (type === 'excel' || type === 'xlsx') {
            const XLSX = await import('xlsx');
            const wb = XLSX.utils.book_new();
            // Try to parse content as JSON rows, fallback to single cell text
            let ws;
            try {
                const rows = JSON.parse(content);
                if (Array.isArray(rows)) {
                    ws = XLSX.utils.json_to_sheet(rows);
                } else {
                    ws = XLSX.utils.aoa_to_sheet([[title], [content]]);
                }
            } catch (e) {
                // If not JSON, treat as CSV or raw text
                ws = XLSX.utils.aoa_to_sheet([[title], [content]]);
            }
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            extension = 'xlsx';
        } else {
            return { statusCode: 400, body: 'Invalid file type: ' + type };
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
