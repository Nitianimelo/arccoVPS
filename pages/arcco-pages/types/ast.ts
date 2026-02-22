
export interface PageAST {
    id: string;
    meta: {
        title: string;
        description?: string;
        theme: 'dark' | 'light';
        primaryColor?: string;
    };
    sections: SectionNode[];
}

export type PostFormat = 'square' | 'portrait' | 'story';

export interface PostAST {
    id: string;
    format: PostFormat;
    meta: {
        title: string;
        theme: 'dark' | 'light';
        primaryColor?: string;
    };
    slides: SlideNode[];
}

export interface SlideNode {
    id: string;
    elements: SectionNode[]; // Reusing SectionNode as "Layers" or "Elements" for simplicity, or we can define specific ElementNode
    // For now, let's treat a Slide as a container of Sections (which can be text, image, etc.)
    // Or better: A Slide is a single "Section" that fills the canvas?
    // Let's refine: A Post Slide usually has a background and overlay elements.
    // To reuse existing renderer logic, we can say a Slide contains a list of Elements (similar to Sections but absolute positioned or flex)
    styles?: Record<string, any>;
 }

export type SectionType =
    | 'Hero'
    | 'Features'
    | 'Pricing'
    | 'CTA'
    | 'Footer'
    | 'Testimonials'
    | 'FAQ'
    // Design / Post specific types
    | 'TextOverlay'
    | 'ImageOverlay'
    | 'Shape';

export interface SectionNode {
    id: string;
    type: SectionType;
    // Props flexíveis para cada tipo de seção
    props: Record<string, any>;
    // Estilos overrides (Tailwind classes)
    styles?: {
        background?: string;
        textColor?: string;
        paddingY?: string;
        [key: string]: string | undefined;
    };
}

// Tipos específicos de Props para ajudar no desenvolvimento (opcional, mas bom para docs)

export interface HeroProps {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink?: string;
    secondaryCtaText?: string;
    secondaryCtaLink?: string;
    backgroundImage?: string;
}

export interface FeatureItem {
    icon: string; // Ex: "Rocket", "Zap" (Lucide)
    title: string;
    description: string;
}

export interface FeaturesProps {
    title: string;
    subtitle?: string;
    items: FeatureItem[];
    columns?: 2 | 3 | 4;
}

export interface PricingPlan {
    name: string;
    price: string;
    period?: string;
    features: string[];
    isPopular?: boolean;
    ctaText: string;
}

export interface PricingProps {
    title: string;
    subtitle?: string;
    plans: PricingPlan[];
}
