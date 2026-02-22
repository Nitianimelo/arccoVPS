
import { createClient } from '@supabase/supabase-js';
import { webSearch, webFetch, generatePdf, generateExcel, uploadFileToSupabase } from './lib/agent-tools';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const SYSTEM_PROMPT_V2 = `Você é o Arcco Agent v2 (TypeScript Edition).
Suas capacidades:
- Pesquisar na Web (Tavily/Brave)
- Ler URLs e analisar conteúdo
- Gerar PDFs profissionais e salvar no Supabase
- Gerar planilhas Excel (.xlsx) com dados estruturados
- Responder com precisão e profundidade

Regras:
1. Pense passo-a-passo.
2. Use ferramentas quando necessário. NÃO diga "vou gerar" sem usar a ferramenta — execute imediatamente.
3. Se gerar um arquivo, forneça o link de download no formato [Baixar arquivo](url).
4. Responda em Markdown rico (tabelas, listas, bold).
5. Quando o usuário pedir Excel, planilha ou spreadsheet: use a ferramenta generate_excel diretamente.`;

const TOOLS = [
    {
        type: "function",
        function: {
            name: "web_search",
            description: "Search the web for information",
            parameters: {
                type: "object",
                properties: { query: { type: "string" } },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "web_fetch",
            description: "Fetch and read content from a URL",
            parameters: {
                type: "object",
                properties: { url: { type: "string" } },
                required: ["url"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generate_pdf",
            description: "Generate a PDF file with text content",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                    filename: { type: "string" }
                },
                required: ["title", "content"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generate_excel",
            description: "Generate an Excel (.xlsx) spreadsheet file with structured data. Use this when the user asks for Excel, planilha, spreadsheet ou tabela in a file.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Sheet name (max 31 chars)" },
                    headers: {
                        type: "array",
                        items: { type: "string" },
                        description: "Column headers"
                    },
                    rows: {
                        type: "array",
                        items: { type: "array", items: { type: "string" } },
                        description: "Data rows, each row is an array of string values"
                    },
                    filename: { type: "string", description: "Output filename without extension" }
                },
                required: ["title", "headers", "rows"]
            }
        }
    }
];

// Helper to get OpenRouter Key from DB if not in Env
const getOpenRouterKey = async (supabase: any): Promise<string | null> => {
    if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
    if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
    try {
        const { data } = await supabase.from('apikeys').select('api_key').eq('provider', 'openrouter').eq('is_active', true).maybeSingle();
        if (data?.api_key) return data.api_key;
        const { data: dataCamel } = await supabase.from('ApiKeys').select('api_key').eq('provider', 'openrouter').eq('is_active', true).maybeSingle();
        if (dataCamel?.api_key) return dataCamel.api_key;
    } catch (e) {
        console.error("Error fetching API key from DB:", e);
    }
    return null;
};

// SSE event serializer
const sseEvent = (type: string, content: string): string =>
    `data: ${JSON.stringify({ type, content })}\n\n`;

// v2 Web API format — supports streaming responses
const agentHandler = async (req: Request): Promise<Response> => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();

    const emit = async (type: string, content: string) => {
        await writer.write(encoder.encode(sseEvent(type, content)));
    };

    // Run agent loop asynchronously — response headers returned immediately
    (async () => {
        try {
            const body = await req.json();
            const { messages, model = 'anthropic/claude-3.5-sonnet' } = body;

            if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing Supabase Config (URL/KEY)");
            const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

            const apiKey = await getOpenRouterKey(supabase);
            if (!apiKey) throw new Error("API Key not found");

            let currentMessages = [
                { role: 'system', content: SYSTEM_PROMPT_V2 },
                ...messages
            ];
            let iteration = 0;
            const MAX_ITERATIONS = 10;

            while (iteration < MAX_ITERATIONS) {
                iteration++;
                await emit('steps', `<step>🤔 Analisando... (iteração ${iteration}/${MAX_ITERATIONS})</step>`);

                const completionRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://arcco.ai",
                    },
                    body: JSON.stringify({
                        model,
                        messages: currentMessages,
                        stream: false,
                        max_tokens: 8192,
                        tools: TOOLS
                    })
                });

                const data = await completionRes.json();
                if (data.error) throw new Error(JSON.stringify(data.error));

                const message = data.choices[0].message;
                currentMessages.push(message);

                if (message.tool_calls) {
                    const toolNames = message.tool_calls.map((t: any) => t.function.name).join(', ');
                    await emit('steps', `<step>🔧 Usando: ${toolNames}</step>`);

                    for (const tool of message.tool_calls) {
                        const funcName = tool.function.name;
                        const funcArgs = JSON.parse(tool.function.arguments);
                        let result = "";

                        await emit('steps', `<step>⚡ Executando ${funcName}...</step>`);

                        try {
                            if (funcName === 'web_search') {
                                const searchKey = process.env.TAVILY_API_KEY || process.env.VITE_TAVILY_API_KEY || process.env.BRAVE_SEARCH_API_KEY;
                                result = await webSearch(funcArgs.query, searchKey);
                            } else if (funcName === 'web_fetch') {
                                result = await webFetch(funcArgs.url);
                            } else if (funcName === 'generate_pdf') {
                                const buffer = await generatePdf(funcArgs.title, funcArgs.content);
                                const url = await uploadFileToSupabase(
                                    SUPABASE_URL, SUPABASE_KEY, 'chat-uploads',
                                    funcArgs.filename || `doc-${Date.now()}.pdf`,
                                    buffer, 'application/pdf'
                                );
                                result = `PDF Gerado: ${url}`;
                            } else if (funcName === 'generate_excel') {
                                const headers = Array.isArray(funcArgs.headers) ? funcArgs.headers.map(String) : [];
                                const rows = Array.isArray(funcArgs.rows) ? funcArgs.rows.map((r: any) => Array.isArray(r) ? r.map(String) : []) : [];
                                const buffer = await generateExcel(funcArgs.title || 'Planilha', headers, rows);
                                const url = await uploadFileToSupabase(
                                    SUPABASE_URL, SUPABASE_KEY, 'chat-uploads',
                                    funcArgs.filename ? `${funcArgs.filename}.xlsx` : `planilha-${Date.now()}.xlsx`,
                                    buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                                );
                                result = `Excel Gerado: ${url}`;
                            }
                        } catch (e: any) {
                            result = `Erro: ${e.message}`;
                            await emit('steps', `<step>⚠️ Erro em ${funcName}: ${e.message}</step>`);
                        }

                        currentMessages.push({
                            role: 'tool',
                            tool_call_id: tool.id,
                            content: result
                        });
                        await emit('steps', `<step>✅ ${funcName} concluído.</step>`);
                    }
                } else {
                    // Final response — stream content in word chunks for typing effect
                    const finalContent: string = message.content || '';
                    const words = finalContent.split(' ');
                    const CHUNK_SIZE = 8;

                    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
                        const chunk = words.slice(i, i + CHUNK_SIZE).join(' ');
                        const isLast = i + CHUNK_SIZE >= words.length;
                        await emit('chunk', chunk + (isLast ? '' : ' '));
                    }

                    await emit('steps', '<step>✅ Missão cumprida.</step>');
                    break;
                }
            }

            if (iteration >= MAX_ITERATIONS && !currentMessages.find(m => m.role === 'assistant' && !(m as any).tool_calls)) {
                await emit('steps', '<step>⚠️ Limite de iterações atingido.</step>');
                await emit('chunk', 'Limite de iterações atingido. Por favor, simplifique a solicitação.');
            }

        } catch (e: any) {
            console.error("[AGENT-CHAT] Error:", e);
            await emit('error', e.message);
        } finally {
            await writer.close();
        }
    })();

    return new Response(readable, {
        status: 200,
        headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        }
    });
};

export default agentHandler;
