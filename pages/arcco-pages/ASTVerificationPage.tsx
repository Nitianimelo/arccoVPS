
import React from 'react';
import { ASTRenderer } from './renderer/ASTRenderer';
import { PageAST } from './types/ast';

const TEST_AST: PageAST = {
    id: 'test-page',
    meta: { title: 'Verification Page', theme: 'dark' },
    sections: [
        {
            id: 'h1',
            type: 'Hero',
            props: {
                title: 'Verificação da Fase 2: Successo!',
                subtitle: 'Se você está vendo esta página, o Renderizador AST (The Eyes) e os Componentes Atômicos estão funcionando perfeitamente.',
                ctaText: 'Sistema Operacional',
                ctaLink: '#',
                backgroundImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop'
            }
        },
        {
            id: 'f1',
            type: 'Features',
            props: {
                title: 'Arquitetura Validada',
                subtitle: 'Os seguintes módulos foram implementados e testados:',
                columns: 3,
                items: [
                    { icon: 'Check', title: 'AST Schema', description: 'Estrutura JSON definida e tipada.' },
                    { icon: 'Layout', title: 'Atomic Components', description: 'Hero, Features, Pricing, CTA, Footer criados.' },
                    { icon: 'Database', title: 'Component Registry', description: 'Mapeamento dinâmico de strings para React.' },
                    { icon: 'Zap', title: 'Dual Mode Builder', description: 'Suporte híbrido para Code Mode e Design Mode.' },
                    { icon: 'Cpu', title: 'Backend Logic', description: 'Agent agora gera patches JSON granulares.' },
                    { icon: 'Shield', title: 'Type Safety', description: 'Interfaces TypeScript rigorosas.' }
                ]
            }
        },
        {
            id: 'cta1',
            type: 'CTA',
            props: {
                title: 'Pronto para a Fase 3?',
                description: 'A fundação está sólida. O próximo passo é refinar a UX do editor visual.',
                ctaText: 'Finalizar Tarefa'
            }
        }
    ]
};

export default function ASTVerificationPage() {
    return (
        <div style={{ height: '100vh', overflowY: 'auto' }}>
            <ASTRenderer ast={TEST_AST} />
        </div>
    );
}
