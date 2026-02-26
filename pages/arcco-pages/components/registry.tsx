import React from 'react';
import * as LucideIcons from 'lucide-react';
import { SectionType } from '../types/ast';

import { NavbarSection }   from './NavbarSection';
import { HeroSection }     from './HeroSection';
import { MarqueeSection }  from './MarqueeSection';
import { FeaturesSection } from './FeaturesSection';
import { PricingSection }  from './PricingSection';
import { FAQSection }      from './FAQSection';
import { CTASection }      from './CTASection';
import { FooterSection }   from './FooterSection';

// Registry: mapeia SectionType → componente React
export const SECTION_COMPONENTS: Record<SectionType, React.ComponentType<any>> = {
    Navbar:       NavbarSection,
    Hero:         HeroSection,
    Marquee:      MarqueeSection,
    Features:     FeaturesSection,
    Pricing:      PricingSection,
    FAQ:          FAQSection,
    CTA:          CTASection,
    Footer:       FooterSection,
    Testimonials: () => (
        <div className="py-16 text-center text-neutral-500 border-t border-white/5">
            Testimonials — em breve
        </div>
    ),
    // Design / Post types (não usados em landing pages)
    TextOverlay:  () => null,
    ImageOverlay: () => null,
    Shape:        () => null,
};

// Icon resolver helper — resolve nome de ícone Lucide para ReactNode
export const resolveIcon = (iconName: string): React.ReactNode => {
    if (!iconName) return null;

    const cleanName = iconName.replace('lucide-react/', '').trim();
    const IconComponent = (LucideIcons as any)[cleanName];

    if (IconComponent) {
        return <IconComponent className="w-6 h-6" />;
    }

    return <LucideIcons.HelpCircle className="w-6 h-6 text-gray-400" />;
};
