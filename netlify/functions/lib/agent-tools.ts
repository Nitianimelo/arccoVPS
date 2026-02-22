
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// Tavily / Brave Search Wrapper
export const webSearch = async (query: string, apiKey?: string): Promise<string> => {
    if (!apiKey) return "ERRO: Chave de API de busca não configurada.";

    try {
        if (apiKey.startsWith('tvly-')) {
            const response = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: query,
                    search_depth: "basic",
                    include_answer: true,
                    max_results: 10
                })
            });
            const data = await response.json();

            let results = `**Resumo:** ${data.answer}\n\n**Fontes:**\n`;
            if (data.results) {
                data.results.forEach((r: any, i: number) => {
                    results += `[${i + 1}] ${r.title} (${r.url})\n${r.content.slice(0, 300)}...\n\n`;
                });
            } else {
                results += "Nenhum resultado encontrado.";
            }

            return results;
        }

        // Brave Search Fallback
        const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
            headers: { 'X-Subscription-Token': apiKey }
        });

        if (!response.ok) throw new Error(`Search API error: ${response.status}`);

        const data = await response.json();
        const results = data.web?.results?.map((r: any) =>
            `• **${r.title}**\n  ${r.url}\n  ${r.description}`
        ).join('\n\n') || "Sem resultados.";

        return `**Resultados para "${query}":**\n\n${results}`;

    } catch (error: any) {
        return `Erro na busca: ${error.message}`;
    }
};

// Robust Web Fetch (Cheerio - Lazy Load)
export const webFetch = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'ArccoAgent/2.0' } });
        const html = await response.text();

        // Lazy load cheerio to prevent startup crash
        const cheerio = await import('cheerio');
        const $ = cheerio.load(html);

        // Cleanup
        $('script, style, nav, footer, header, aside, form, svg, noscript').remove();

        // Extract text
        let text = $('body').text().replace(/\s+/g, ' ').trim();

        // Metadata
        const title = $('title').text().trim();

        if (text.length > 20000) text = text.slice(0, 20000) + "... [Truncado]";

        return `**Conteúdo de ${url}**\n**Título:** ${title}\n\n${text}`;
    } catch (error: any) {
        return `Erro ao ler URL (${url}): ${error.message}`;
    }
};

// Generate PDF (PDFKit - Lazy Load)
export const generatePdf = async (title: string, content: string): Promise<Buffer> => {
    // Lazy load PDFKit
    const PDFDocumentPkg = await import('pdfkit');
    // Handle ESM/CommonJS duality if necessary
    const PDFDocument = PDFDocumentPkg.default || PDFDocumentPkg;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        doc.font('Helvetica-Bold').fontSize(18).text(title, { align: 'center' });
        doc.moveDown();
        doc.font('Helvetica').fontSize(12).text(content, { align: 'justify' });

        doc.end();
    });
};

// Generate Excel (.xlsx)
export const generateExcel = async (title: string, headers: string[], rows: string[][]): Promise<Buffer> => {
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31) || 'Dados');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.from(buffer);
};

// Upload to Supabase
export const uploadFileToSupabase = async (
    supabaseUrl: string,
    supabaseKey: string,
    bucket: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string
): Promise<string | null> => {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileBuffer, { contentType, upsert: true });

    if (error) {
        console.error('Upload Error:', error);
        return null;
    }

    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl.publicUrl;
};
