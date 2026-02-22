
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { SectionType } from '../types/ast';

// Import atomic components (we will create these next)
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { PricingSection } from './PricingSection';
import { CTASection } from './CTASection';
import { FooterSection } from './FooterSection';

// Registry mapping
export const SECTION_COMPONENTS: Record<SectionType, React.ComponentType<any>> = {
    Hero: HeroSection,
    Features: FeaturesSection,
    Pricing: PricingSection,
    CTA: CTASection,
    Footer: FooterSection,
    Testimonials: () => <div>Testimonials Placeholder</div>, // Placeholder
    FAQ: () => <div>FAQ Placeholder</div>, // Placeholder
};

// Icon resolver helper
export const resolveIcon = (iconName: string): React.ReactNode => {
    if (!iconName) return null;

    // Format: "lucide-react/Rocket" or just "Rocket"
    const cleanName = iconName.replace('lucide-react/', '').trim();

    // @ts-ignore - Dynamic access to Lucide icons
    const IconComponent = (LucideIcons as any)[cleanName];

    if (IconComponent) {
        return <IconComponent className="w-6 h-6" />;
    }

    // Fallback
    return <LucideIcons.HelpCircle className="w-6 h-6 text-gray-400" />;
};
