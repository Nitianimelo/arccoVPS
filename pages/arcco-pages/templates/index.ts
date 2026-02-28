// Map of available templates with their metadata for the AI Template Selector

export interface TemplateMetadata {
    id: string;
    name: string;
    description: string;
    keywords: string[];
}

export const AVAILABLE_TEMPLATES: TemplateMetadata[] = [
    {
        id: "01-clinica-estetica",
        name: "Clínica de Estética",
        description: "Template focado em beleza, saúde, estética, procedimentos faciais e corporais com design clean e elegante.",
        keywords: ["saúde", "beleza", "estética", "clínica", "odonto", "dentista", "harmonização", "spa", "skincare", "médico", "medicina"]
    },
    {
        id: "02-tech-startup",
        name: "Tech Startup & SaaS",
        description: "Template moderno e dark para empresas de tecnologia, software, aplicativos e startups.",
        keywords: ["tecnologia", "startup", "saas", "software", "app", "aplicativo", "dev", "programação", "ti", "ai", "inteligência artificial"]
    },
    {
        id: "03-restaurant-gourmet",
        name: "Restaurante Gourmet",
        description: "Template para gastronomia, restaurantes, lanchonetes e bistrôs, focando em imagens de comida e menu.",
        keywords: ["comida", "food", "restaurante", "hamburgueria", "pizzaria", "cafeteria", "bistrô", "gastronomia", "menu", "delivery"]
    },
    {
        id: "04-fitness-academy",
        name: "Fitness & Academia",
        description: "Template enérgico para academias, crossfit, personal trainers e suplementação.",
        keywords: ["fitness", "academia", "gym", "crossfit", "personal", "esporte", "saúde", "treino", "suplemento", "musculação"]
    },
    {
        id: "05-interior-design",
        name: "Design de Interiores & Arquitetura",
        description: "Template sofisticado para escritórios de arquitetura, corretores de imóveis e decoração.",
        keywords: ["arquitetura", "imóveis", "corretor", "imobiliária", "design", "interiores", "decoração", "reforma", "casa", "apartamento"]
    },
    {
        id: "06-finance-app",
        name: "Finanças & Banco",
        description: "Template corporativo para fintechs, bancos, contabilidade e consultoria financeira.",
        keywords: ["finanças", "banco", "fintech", "investimento", "contabilidade", "consultoria", "dinheiro", "corporativo", "cripto"]
    },
    {
        id: "07-travel-agency",
        name: "Agência de Viagens",
        description: "Template vibrante para pacotes de viagens, turismo, hotéis e pousadas.",
        keywords: ["viagem", "turismo", "hotel", "pousada", "agência", "férias", "destinos", "passeios", "voos"]
    },
    {
        id: "08-education-platform",
        name: "Educação & Cursos EAD",
        description: "Template para plataformas de ensino, escolas, cursos online e infoprodutos educacionais.",
        keywords: ["educação", "curso", "ead", "escola", "faculdade", "infoproduto", "professor", "aula", "mentoria", "aprender"]
    },
    {
        id: "09-fashion-ecommerce",
        name: "Moda & E-commerce",
        description: "Template fashion para lojas de roupas, acessórios, sapatos e e-commerce em geral.",
        keywords: ["moda", "loja", "ecommerce", "roupa", "vestuário", "acessórios", "fashion", "vendas", "produtos", "beleza"]
    },
    {
        id: "10-health-wellness",
        name: "Saúde Mental & Bem-estar",
        description: "Template tranquilo e acolhedor para psicologia, terapia, yoga e saúde mental.",
        keywords: ["psicologia", "terapia", "yoga", "saúde mental", "bem-estar", "mindfulness", "holístico", "meditação", "clínica"]
    }
];

// Helper to get raw HTML content using Vite's ?raw import
// We map the raw file imports explicitly so Vite can bundle them statically
const templateFiles = import.meta.glob('./dataset/*.html', { query: '?raw', import: 'default' });

export const getTemplateHtml = async (id: string): Promise<string | null> => {
    try {
        const filePath = Object.keys(templateFiles).find(path => path.includes(id));
        if (!filePath) return null;

        // The glob import returns a function that resolves to the raw string
        const htmlContent = await templateFiles[filePath]();
        return htmlContent as string;
    } catch (error) {
        console.error(`Error loading template HTML for ${id}:`, error);
        return null;
    }
};
