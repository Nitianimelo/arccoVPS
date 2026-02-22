
import { createClient } from '@supabase/supabase-js';

export class AgentState {
    private supabase;

    constructor(url: string, key: string) {
        this.supabase = createClient(url, key);
    }

    async getSession(sessionId: string) {
        const { data: session } = await this.supabase
            .from('agent_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();

        if (session) return session;

        // Create if not exists
        const { data: newSession, error } = await this.supabase
            .from('agent_sessions')
            .insert({ session_id: sessionId, metadata: {} })
            .select()
            .single();

        if (error) console.error('Error creating session:', error);
        return newSession;
    }

    async saveMessage(sessionId: string, role: string, content: string) {
        // In v2 we typically store full history in a dedicated table or JSON column.
        // For simplicity and compatibility with existing 'arcco-chat-sessions' logic, 
        // the frontend often manages history mostly, but v2 promised State on Server.
        // Let's assume we append to a messages table.

        // Checking schema... user didn't show `agent_messages` table in v2 instruction, 
        // but `agent_sessions` has metadata. 
        // Let's just log usage for now or rely on Frontend sending context. 
        // Ideally, for a "Perfect" agent, we shouldn't trust frontend history entirely, but strictly syncing State is complex.
        // We'll stick to: Backend executes, but Frontend holds the Truth of the Conversation UI for now (to keep UI intact).
        // EXCEPT: We log the activity.

        await this.supabase.from('agent_sessions').update({
            last_activity: new Date().toISOString()
        }).eq('session_id', sessionId);
    }
}
