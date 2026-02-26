import { supabase } from './supabase';

export interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
}

export interface EvolutionInstancePayload {
  instanceName: string;
  agentId: string;
  agentName: string;
  userEmail: string;
}

interface EvolutionResponse<T> {
  data?: T;
  error?: { message?: string };
}

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

const buildHeaders = (apiKey: string) => ({
  apikey: apiKey,
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json'
});

const extractList = <T>(payload: unknown): T[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const list = record.data || record.chats || record.messages || record.instances || record.result;
    if (Array.isArray(list)) return list as T[];
  }
  return [];
};

const extractQrCode = (payload: unknown): string | null => {
  if (!payload) return null;
  if (typeof payload === 'string') return payload;

  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;

    // Check direct string fields first
    const directFields = ['base64', 'qrCode', 'qr', 'qr_code', 'code'];
    for (const field of directFields) {
      if (typeof record[field] === 'string') return record[field] as string;
    }

    // Evolution v2: qrcode is a nested object { base64: '...', code: '...' }
    const nestedObjects = ['qrcode', 'qrCode', 'qr', 'data'];
    for (const field of nestedObjects) {
      const nested = record[field];
      if (nested && typeof nested === 'object') {
        const nestedRecord = nested as Record<string, unknown>;
        // Prefer base64 image, fall back to code string
        if (typeof nestedRecord.base64 === 'string') return nestedRecord.base64;
        if (typeof nestedRecord.qrcode === 'string') return nestedRecord.qrcode;
        if (typeof nestedRecord.qrCode === 'string') return nestedRecord.qrCode;
        if (typeof nestedRecord.code === 'string') return nestedRecord.code;
      }
    }
  }

  return null;
};

const requestEvolution = async <T>(
  config: EvolutionConfig,
  path: string,
  init?: RequestInit
): Promise<T> => {
  const url = `${normalizeBaseUrl(config.baseUrl)}${path}`;
  console.log(`[Evolution] ${init?.method || 'GET'} ${url}`);

  const response = await fetch(url, {
    ...init,
    headers: {
      ...buildHeaders(config.apiKey),
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '{}');
    console.error(`[Evolution] HTTP ${response.status} from ${path}:`, errorBody);

    let errorMessage = `Erro ${response.status} da Evolution API`;
    try {
      const parsed = JSON.parse(errorBody) as Record<string, unknown>;
      // Evolution returns errors in various formats; handle all of them
      const msg =
        parsed.message ||
        (parsed.error as Record<string, unknown> | undefined)?.message ||
        (parsed.response as Record<string, unknown> | undefined)?.message;
      if (typeof msg === 'string') {
        errorMessage = msg;
      } else if (Array.isArray(msg) && msg.length > 0) {
        errorMessage = msg.join('; ');
      }
    } catch { /* ignore parse error */ }

    throw new Error(errorMessage);
  }

  return response.json();
};

export const getActiveEvolutionConfig = async (): Promise<EvolutionConfig | null> => {
  const { data, error } = await supabase
    .from('ApiKeys')
    .select('api_key, base_url')
    .eq('provider', 'evolution')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  const record = data[0] as { api_key?: string; base_url?: string };
  if (!record.api_key || !record.base_url) return null;

  return {
    apiKey: record.api_key,
    baseUrl: record.base_url
  };
};

export const createEvolutionInstance = async (
  config: EvolutionConfig,
  payload: EvolutionInstancePayload
): Promise<{ qrCode?: string }> => {
  // Sanitize instanceName: Evolution API requires alphanumeric names, not pure numbers
  const sanitizedName = `arcco-${String(payload.instanceName).replace(/[^a-zA-Z0-9-_]/g, '')}`;

  const body = {
    instanceName: sanitizedName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
    description: `${payload.agentName} (${payload.userEmail})`,
    metadata: {
      agentId: payload.agentId,
      agentName: payload.agentName,
      userEmail: payload.userEmail
    }
  };

  console.log('[Evolution] Creating instance with payload:', JSON.stringify(body, null, 2));

  try {
    const response = await requestEvolution<EvolutionResponse<Record<string, unknown>>>(
      config,
      '/instance/create',
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );

    console.log('[Evolution] Create instance response:', JSON.stringify(response, null, 2));

    const qrCode = extractQrCode(response) || extractQrCode(response?.data) || undefined;
    console.log('[Evolution] Extracted QR code from create:', qrCode ? `${qrCode.substring(0, 50)}...` : 'null');

    return { qrCode };
  } catch (err) {
    const errorMsg = (err as Error).message;
    console.warn('[Evolution] Create failed:', errorMsg);

    // If instance already exists, try connecting to get QR code
    if (errorMsg.includes('already') || errorMsg.includes('in use') || errorMsg.includes('exists') || errorMsg.includes('403') || errorMsg.includes('409') || errorMsg.includes('500')) {
      console.log('[Evolution] Instance may already exist, trying to connect instead...');
      return connectEvolutionInstance(config, sanitizedName);
    }

    throw err;
  }
};

export const connectEvolutionInstance = async (
  config: EvolutionConfig,
  instanceName: string
): Promise<{ qrCode?: string }> => {
  const paths = [
    `/instance/connect/${instanceName}`,
    `/instance/qrcode/${instanceName}`,
    `/instance/qr/${instanceName}`
  ];

  for (const path of paths) {
    try {
      console.log(`[Evolution] Trying connect path: ${path}`);
      const response = await requestEvolution<unknown>(config, path);
      console.log(`[Evolution] Response from ${path}:`, JSON.stringify(response, null, 2));

      const qrCode = extractQrCode(response);
      if (qrCode) {
        console.log('[Evolution] QR code found via:', path);
        return { qrCode };
      }
    } catch (err) {
      console.log(`[Evolution] Path ${path} failed:`, (err as Error).message);
      continue;
    }
  }

  console.warn('[Evolution] No QR code found from any connect path');
  return {};
};

export const getEvolutionConnectionState = async (
  config: EvolutionConfig,
  instanceName: string
): Promise<string | null> => {
  const paths = [
    `/instance/connectionState/${instanceName}`,
    `/instance/status/${instanceName}` // Fallback
  ];

  for (const path of paths) {
    try {
      const response = await requestEvolution<unknown>(config, path);
      if (typeof response === 'string') return response;
      if (typeof response === 'object' && response !== null) {
        const record = response as Record<string, unknown>;

        // Check standard paths
        if (typeof record.state === 'string') return record.state;
        if (typeof record.status === 'string') return record.status;

        // Check nested "instance" object (Evolution v2 common pattern)
        const instance = record.instance as Record<string, unknown> | undefined;
        if (instance?.state && typeof instance.state === 'string') return instance.state;
        if (instance?.status && typeof instance.status === 'string') return instance.status;

        // Check nested "connectionState" object
        const connectionState = record.connectionState as Record<string, unknown> | undefined;
        if (connectionState?.state && typeof connectionState.state === 'string') return connectionState.state;

        // Check nested "data" (legacy v1)
        const data = record.data as Record<string, unknown> | undefined;
        if (data?.state && typeof data.state === 'string') return data.state;
      }
    } catch {
      continue;
    }
  }

  return null;
};

export const disconnectEvolutionInstance = async (
  config: EvolutionConfig,
  instanceName: string
): Promise<void> => {
  const paths = [
    { path: `/instance/logout/${instanceName}`, method: 'POST' },
    { path: `/instance/delete/${instanceName}`, method: 'DELETE' }
  ];

  for (const entry of paths) {
    try {
      await requestEvolution(config, entry.path, { method: entry.method });
      return;
    } catch {
      continue;
    }
  }

  throw new Error('Não foi possível desconectar a instância.');
};

export const deleteEvolutionInstance = async (
  config: EvolutionConfig,
  instanceName: string
): Promise<void> => {
  try {
    console.log(`[Evolution] Deleting instance: ${instanceName}`);
    await requestEvolution(config, `/instance/delete/${instanceName}`, { method: 'DELETE' });
    console.log(`[Evolution] Instance ${instanceName} deleted successfully`);
  } catch (err) {
    console.warn(`[Evolution] Failed to delete instance ${instanceName}:`, (err as Error).message);
    // Don't throw — instance may not exist, that's OK
  }
};

export const fetchEvolutionChats = async (
  config: EvolutionConfig,
  instanceName: string
): Promise<Array<Record<string, unknown>>> => {
  // Evolution API v2 uses POST /chat/findChats/{instance}
  const attempts = [
    { path: `/chat/findChats/${instanceName}`, method: 'POST', body: '{}' },
    { path: `/chat/findChats/${instanceName}`, method: 'GET', body: undefined },
    { path: `/chat/find/${instanceName}`, method: 'POST', body: '{}' },
    { path: `/chat/find/${instanceName}`, method: 'GET', body: undefined },
  ];

  for (const { path, method, body } of attempts) {
    try {
      console.log(`[Evolution] Trying chats: ${method} ${path}`);
      const response = await requestEvolution<unknown>(config, path, {
        method,
        ...(body ? { body } : {})
      });
      console.log('[Evolution] Chats raw response type:', typeof response, Array.isArray(response) ? `array(${(response as unknown[]).length})` : '');
      console.log('[Evolution] Chats raw response:', JSON.stringify(response, null, 2).substring(0, 500));

      const list = extractList<Record<string, unknown>>(response);
      console.log(`[Evolution] Extracted ${list.length} chats from ${path}`);
      if (list.length > 0) {
        console.log('[Evolution] First chat sample:', JSON.stringify(list[0], null, 2).substring(0, 300));
        return list;
      }
    } catch (err) {
      console.log(`[Evolution] Chats ${method} ${path} failed:`, (err as Error).message);
      continue;
    }
  }

  console.warn('[Evolution] No chats found from any endpoint');
  return [];
};

export const fetchEvolutionMessages = async (
  config: EvolutionConfig,
  instanceName: string,
  chatId: string,
  contactNumber?: string
): Promise<Array<Record<string, unknown>>> => {
  // The remoteJid for WhatsApp is typically number@s.whatsapp.net
  const remoteJid = chatId.includes('@') ? chatId : (contactNumber ? `${contactNumber}@s.whatsapp.net` : chatId);

  // Evolution API v2: POST /chat/findMessages/{instance} with { where: { key: { remoteJid } } }
  const postAttempts = [
    {
      path: `/chat/findMessages/${instanceName}`,
      body: JSON.stringify({ where: { key: { remoteJid } }, limit: 50 })
    },
    {
      path: `/chat/findMessages/${instanceName}`,
      body: JSON.stringify({ where: { key: { remoteJid: chatId } }, limit: 50 })
    },
    {
      path: `/message/find/${instanceName}`,
      body: JSON.stringify({ chatId: remoteJid, limit: 50 })
    },
    {
      path: `/message/find/${instanceName}`,
      body: JSON.stringify({ chatId, number: contactNumber, limit: 50 })
    }
  ];

  for (const { path, body } of postAttempts) {
    try {
      console.log(`[Evolution] Trying messages: POST ${path} body=${body.substring(0, 100)}`);
      const response = await requestEvolution<unknown>(config, path, { method: 'POST', body });
      console.log('[Evolution] Messages raw response type:', typeof response, Array.isArray(response) ? `array(${(response as unknown[]).length})` : '');

      // Response may be { messages: { records: [...] } } or just an array
      let list = extractList<Record<string, unknown>>(response);

      // Also try nested .messages.records pattern
      if (list.length === 0 && typeof response === 'object' && response !== null) {
        const r = response as Record<string, unknown>;
        const msgs = r.messages as Record<string, unknown> | undefined;
        if (msgs?.records && Array.isArray(msgs.records)) {
          list = msgs.records as Record<string, unknown>[];
        } else if (Array.isArray(r.messages)) {
          list = r.messages as Record<string, unknown>[];
        }
      }

      console.log(`[Evolution] Extracted ${list.length} messages from ${path}`);
      if (list.length > 0) {
        console.log('[Evolution] First message sample:', JSON.stringify(list[0], null, 2).substring(0, 400));
        return list;
      }
    } catch (err) {
      console.log(`[Evolution] Messages POST ${path} failed:`, (err as Error).message);
      continue;
    }
  }

  // GET fallback
  const query = contactNumber ? `?number=${encodeURIComponent(contactNumber)}` : '';
  const getAttempts = [
    `/message/find/${instanceName}${query}`,
    `/message/list/${instanceName}${query}`,
    `/chat/messages/${instanceName}${query}`
  ];

  for (const path of getAttempts) {
    try {
      console.log(`[Evolution] Trying messages: GET ${path}`);
      const response = await requestEvolution<unknown>(config, path);
      const list = extractList<Record<string, unknown>>(response);
      if (list.length > 0) {
        console.log(`[Evolution] Got ${list.length} messages from GET ${path}`);
        return list;
      }
    } catch {
      continue;
    }
  }

  console.warn('[Evolution] No messages found from any endpoint');
  return [];
};

export const sendEvolutionTextMessage = async (
  config: EvolutionConfig,
  instanceName: string,
  number: string,
  text: string
): Promise<void> => {
  // Ensure number is clean (digits only, no @s.whatsapp.net)
  const cleanNumber = number.split('@')[0].replace(/\D/g, '');

  console.log(`[Evolution] Sending message to ${cleanNumber}: "${text.substring(0, 80)}..."`);

  const response = await requestEvolution<unknown>(config, `/message/sendText/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      number: cleanNumber,
      text
    })
  });

  console.log('[Evolution] sendText response:', JSON.stringify(response, null, 2).substring(0, 200));

  if (!response) {
    throw new Error('Erro ao enviar mensagem');
  }
};

/**
 * Fetch recent messages (all chats). Used for auto-reply polling.
 */
export const fetchRecentMessages = async (
  config: EvolutionConfig,
  instanceName: string,
  limit: number = 20
): Promise<Array<Record<string, unknown>>> => {
  // Try the v2 findMessages without a remoteJid filter (gets all messages)
  const attempts = [
    { path: `/chat/findMessages/${instanceName}`, method: 'POST', body: JSON.stringify({ limit }) },
    { path: `/message/find/${instanceName}`, method: 'POST', body: JSON.stringify({ limit }) },
    { path: `/message/find/${instanceName}?limit=${limit}`, method: 'GET', body: undefined },
    { path: `/message/list/${instanceName}?limit=${limit}`, method: 'GET', body: undefined }
  ];

  for (const { path, method, body } of attempts) {
    try {
      const response = await requestEvolution<unknown>(config, path, {
        method,
        ...(body ? { body } : {})
      });

      let list = extractList<Record<string, unknown>>(response);

      // Also try nested response shapes
      if (list.length === 0 && typeof response === 'object' && response !== null) {
        const r = response as Record<string, unknown>;
        const msgs = r.messages as Record<string, unknown> | undefined;
        if (msgs?.records && Array.isArray(msgs.records)) {
          list = msgs.records as Record<string, unknown>[];
        } else if (Array.isArray(r.messages)) {
          list = r.messages as Record<string, unknown>[];
        }
      }

      if (list.length > 0) {
        console.log(`[Evolution] fetchRecentMessages got ${list.length} msgs from ${method} ${path}`);
        return list;
      }
    } catch {
      continue;
    }
  }

  return [];
};

/**
 * Extract text content from a raw Evolution API message record.
 * Handles various message shapes from different API versions.
 */
export const extractMessageText = (msg: Record<string, unknown>): string => {
  // Direct fields
  if (typeof msg.body === 'string' && msg.body) return msg.body;
  if (typeof msg.content === 'string' && msg.content) return msg.content;
  if (typeof msg.text === 'string' && msg.text) return msg.text;

  // Nested message object
  const message = msg.message as Record<string, unknown> | undefined;
  if (message) {
    if (typeof message.conversation === 'string' && message.conversation) return message.conversation;
    const ext = message.extendedTextMessage as Record<string, unknown> | undefined;
    if (typeof ext?.text === 'string' && ext.text) return ext.text;
    if (typeof message.text === 'string' && message.text) return message.text;
  }

  return '';
};

/**
 * Extract message ID from a raw Evolution API message record.
 */
export const extractMessageId = (msg: Record<string, unknown>, fallback: number): string => {
  if (typeof msg.id === 'string') return msg.id;
  const key = msg.key as Record<string, unknown> | undefined;
  if (typeof key?.id === 'string') return key.id;
  if (typeof msg.messageId === 'string') return msg.messageId;
  return String(fallback);
};

/**
 * Extract whether message was sent by us.
 */
export const extractFromMe = (msg: Record<string, unknown>): boolean => {
  if (typeof msg.fromMe === 'boolean') return msg.fromMe;
  const key = msg.key as Record<string, unknown> | undefined;
  if (typeof key?.fromMe === 'boolean') return key.fromMe;
  return false;
};

/**
 * Extract remoteJid (contact identifier) from a message.
 */
export const extractRemoteJid = (msg: Record<string, unknown>): string => {
  if (typeof msg.remoteJid === 'string') return msg.remoteJid;
  const key = msg.key as Record<string, unknown> | undefined;
  if (typeof key?.remoteJid === 'string') return key.remoteJid;
  if (typeof msg.chatId === 'string') return msg.chatId;
  if (typeof msg.from === 'string') return msg.from;
  return '';
};

/**
 * Extract timestamp from a message.
 */
export const extractTimestamp = (msg: Record<string, unknown>): number => {
  const ts = msg.messageTimestamp || msg.timestamp;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') return parseInt(ts, 10) || 0;
  // Sometimes it's a Long object: { low: number, high: number }
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>;
    if (typeof obj.low === 'number') return obj.low;
  }
  return 0;
};

