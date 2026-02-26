import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gfkycxdbbzczrwikhcpr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma3ljeGRiYnpjenJ3aWtoY3ByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc4MjU5MywiZXhwIjoyMDg1MzU4NTkzfQ.zAB2HFhpyrtLD4aOvxDqS63Rvh_NwxgtS8ZhCj8xSnw';

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types for the User table
export interface UserData {
  nome: string;
  email: string;
  plano: string;
  cpf?: string;
  content?: {
    telefone?: string;
    ocupacao?: string;
  };
}

export interface UserRecord {
  id?: string;
  nome: string;
  email: string;
  senha?: string;
  plano: string;
  cpf?: string;
  content?: {
    telefone?: string;
    ocupacao?: string;
  };
  created_at?: string;
}

// Input type for creating user
export interface CreateUserInput {
  nome: string;
  email: string;
  senha: string;
  plano: string;
  cpf?: string;
  telefone?: string;
  ocupacao?: string;
}

// User service functions
export const userService = {
  // Create a new user
  async createUser(userData: CreateUserInput): Promise<{ data: UserRecord | null; error: Error | null }> {
    try {
      console.log('Salvando usuario no Supabase:', userData);

      // Separar dados: colunas diretas vs content (jsonb)
      const insertData = {
        nome: userData.nome,
        email: userData.email,
        senha: userData.senha,
        plano: userData.plano,
        cpf: userData.cpf || null,
        content: {
          telefone: userData.telefone,
          ocupacao: userData.ocupacao
        }
      };

      console.log('Dados para inserir:', insertData);

      const { data, error } = await supabase
        .from('User')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar usuario:', error);
        return { data: null, error: new Error(error.message) };
      }

      console.log('Usuario criado com sucesso:', data);
      return { data, error: null };
    } catch (err) {
      console.error('Erro ao criar usuario:', err);
      return { data: null, error: err as Error };
    }
  },

  // Get user by email
  async getUserByEmail(email: string): Promise<{ data: UserRecord | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('User')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar usuario:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erro ao buscar usuario:', err);
      return { data: null, error: err as Error };
    }
  },

  // Check if email exists
  async emailExists(email: string): Promise<boolean> {
    const { data } = await this.getUserByEmail(email);
    return data !== null;
  },

  // Update user
  async updateUser(id: string, userData: Partial<CreateUserInput>): Promise<{ data: UserRecord | null; error: Error | null }> {
    try {
      // Buscar usuario atual
      const { data: currentUser, error: fetchError } = await supabase
        .from('User')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        return { data: null, error: new Error(fetchError.message) };
      }

      // Preparar dados para atualizar
      const updateData: Record<string, unknown> = {};

      if (userData.nome) updateData.nome = userData.nome;
      if (userData.email) updateData.email = userData.email;
      if (userData.plano) updateData.plano = userData.plano;
      if (userData.cpf) updateData.cpf = userData.cpf;

      // Atualizar content (jsonb) com telefone e ocupacao
      if (userData.telefone || userData.ocupacao) {
        updateData.content = {
          ...currentUser.content,
          telefone: userData.telefone || currentUser.content?.telefone,
          ocupacao: userData.ocupacao || currentUser.content?.ocupacao
        };
      }

      const { data, error } = await supabase
        .from('User')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar usuario:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erro ao atualizar usuario:', err);
      return { data: null, error: err as Error };
    }
  }
};

// Types for the Agents table
export interface AgentUserConfig {
  oferta: string;
  clienteIdeal: string;
  qualificacao: string;
  conducao: string;
  tomLimites: string;
  objetivo: string;
  spreadsheet_id?: string;
  spreadsheet_instruction?: string;
}

export interface AgentRecord {
  id?: string;
  nome: string;
  usuario: string;
  tipo: string;
  system?: string;
  user_config: AgentUserConfig;
  modelo?: string;
  whatsapp_config?: {
    instanceName: string;
    agentId: string;
    userEmail: string;
    phoneNumber?: string;
    businessName?: string;
    status: string;
    connectedAt?: string;
    lastSyncAt?: string;
  } | null;
  created_at?: string;
}

export interface CreateAgentInput {
  nome: string;
  usuario: string;
  tipo: string;
  user_config: AgentUserConfig;
}

// Types for the Spreadsheets table
export interface SpreadsheetRecord {
  id?: string;
  name?: string;
  nome?: string;
  usuario?: string;
  user_email?: string;
  headers?: string[] | string;
  rows?: unknown;
  created_at?: string;
  updated_at?: string;
}

// Agent service functions
export const agentService = {
  // Create a new agent
  async createAgent(agentData: CreateAgentInput): Promise<{ data: AgentRecord | null; error: Error | null }> {
    try {
      console.log('Salvando agente no Supabase:', agentData);

      const { data, error } = await supabase
        .from('Agents')
        .insert([agentData])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar agente:', error);
        return { data: null, error: new Error(error.message) };
      }

      console.log('Agente criado com sucesso:', data);
      return { data, error: null };
    } catch (err) {
      console.error('Erro ao criar agente:', err);
      return { data: null, error: err as Error };
    }
  },

  // Get agents by user
  async getAgentsByUser(usuario: string): Promise<{ data: AgentRecord[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('Agents')
        .select('*')
        .eq('usuario', usuario);

      if (error) {
        console.error('Erro ao buscar agentes:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erro ao buscar agentes:', err);
      return { data: null, error: err as Error };
    }
  },

  // Get agent by id
  async getAgentById(id: string): Promise<{ data: AgentRecord | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('Agents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar agente:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erro ao buscar agente:', err);
      return { data: null, error: err as Error };
    }
  },

  // Update agent
  async updateAgent(id: string, agentData: Partial<CreateAgentInput & Pick<AgentRecord, 'whatsapp_config'>>): Promise<{ data: AgentRecord | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('Agents')
        .update(agentData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar agente:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erro ao atualizar agente:', err);
      return { data: null, error: err as Error };
    }
  },

  // Delete agent
  async deleteAgent(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('Agents')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar agente:', error);
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err) {
      console.error('Erro ao deletar agente:', err);
      return { error: err as Error };
    }
  }
};

// Spreadsheet service functions
// NOTA: Certifique-se de que a tabela 'Spreadsheets' existe no Supabase
const SPREADSHEET_TABLE = 'Spreadsheets';

const isMissingTableError = (message?: string): boolean => {
  if (!message) return false;
  return message.includes('does not exist') || message.includes('relation');
};

export const spreadsheetService = {
  async getSpreadsheetsByUser(email?: string): Promise<{ data: SpreadsheetRecord[] | null; error: Error | null }> {
    try {
      console.log('[Spreadsheet] Buscando planilhas para:', email || 'todos os usuários');

      let query = supabase.from(SPREADSHEET_TABLE).select('*');

      if (email) {
        // Filtra por user_email (coluna existente na tabela)
        query = query.eq('user_email', email);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Spreadsheet] Erro ao buscar planilhas:', error);
        return { data: null, error: new Error(error.message) };
      }

      console.log('[Spreadsheet] Planilhas encontradas:', data?.length || 0);
      return { data, error: null };
    } catch (err) {
      console.error('[Spreadsheet] Erro ao buscar planilhas:', err);
      return { data: null, error: err as Error };
    }
  },

  async createSpreadsheet(input: {
    name: string;
    headers: string[];
    rows: string[][];
    userEmail?: string;
  }): Promise<{ data: SpreadsheetRecord | null; error: Error | null }> {
    try {
      console.log('[Spreadsheet] Criando planilha:', input.name);

      // Payload com as colunas que existem na tabela Spreadsheets
      const payload = {
        name: input.name,
        headers: input.headers,
        rows: input.rows,
        user_email: input.userEmail ?? null
      };

      console.log('[Spreadsheet] Payload:', JSON.stringify(payload, null, 2));

      const { data, error } = await supabase
        .from(SPREADSHEET_TABLE)
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('[Spreadsheet] Erro ao criar planilha:', error);
        console.error('[Spreadsheet] Detalhes do erro:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return { data: null, error: new Error(error.message) };
      }

      console.log('[Spreadsheet] Planilha criada com sucesso:', data);
      return { data, error: null };
    } catch (err) {
      console.error('[Spreadsheet] Erro ao criar planilha:', err);
      return { data: null, error: err as Error };
    }
  },

  async updateSpreadsheet(
    id: string,
    data: { name?: string; headers?: string[]; rows?: string[][] }
  ): Promise<{ data: SpreadsheetRecord | null; error: Error | null }> {
    try {
      console.log('[Spreadsheet] Atualizando planilha:', id);

      const updateData: any = { updated_at: new Date().toISOString() };
      if (data.name) updateData.name = data.name;
      if (data.headers) updateData.headers = data.headers;
      if (data.rows) updateData.rows = data.rows;

      const { data: updated, error } = await supabase
        .from(SPREADSHEET_TABLE)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[Spreadsheet] Erro ao atualizar planilha:', error);
        return { data: null, error: new Error(error.message) };
      }

      console.log('[Spreadsheet] Planilha atualizada com sucesso');
      return { data: updated, error: null };
    } catch (err) {
      console.error('[Spreadsheet] Erro ao atualizar planilha:', err);
      return { data: null, error: err as Error };
    }
  },

  async deleteSpreadsheet(id: string): Promise<{ error: Error | null }> {
    try {
      console.log('[Spreadsheet] Deletando planilha:', id);

      const { error } = await supabase
        .from(SPREADSHEET_TABLE)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Spreadsheet] Erro ao deletar planilha:', error);
        return { error: new Error(error.message) };
      }

      console.log('[Spreadsheet] Planilha deletada com sucesso');
      return { error: null };
    } catch (err) {
      console.error('[Spreadsheet] Erro ao deletar planilha:', err);
      return { error: err as Error };
    }
  }
};
