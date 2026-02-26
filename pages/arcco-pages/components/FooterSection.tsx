import React from 'react';
import { Twitter, Github, Linkedin, Instagram, Zap } from 'lucide-react';

interface FooterLink {
    label: string;
    href?: string;
}

interface FooterLinkGroup {
    label: string;
    items: FooterLink[] | string[];
}

interface FooterProps {
    brandName?: string;
    tagline?: string;
    copyright?: string;
    links?: FooterLinkGroup[];
    disclaimer?: string;
    socialLinks?: {
        twitter?: string;
        github?: string;
        linkedin?: string;
        instagram?: string;
    };
}

const DEFAULT_LINKS: FooterLinkGroup[] = [
    { label: 'Produto', items: ['Funcionalidades', 'Preços', 'Integrações'] },
    { label: 'Empresa', items: ['Sobre', 'Blog', 'Carreiras'] },
    { label: 'Legal', items: ['Privacidade', 'Termos', 'Segurança'] },
];

export const FooterSection: React.FC<FooterProps> = (props) => {
    const {
        brandName = 'Arcco',
        tagline = 'Construindo o futuro das experiências digitais.',
        copyright,
        links = DEFAULT_LINKS,
        disclaimer,
        socialLinks,
    } = props;

    const year = new Date().getFullYear();
    const copyrightText = copyright || `© ${year} ${brandName}. Todos os direitos reservados.`;

    const socials = [
        { icon: Twitter,   href: socialLinks?.twitter,   label: 'Twitter'   },
        { icon: Github,    href: socialLinks?.github,    label: 'GitHub'    },
        { icon: Linkedin,  href: socialLinks?.linkedin,  label: 'LinkedIn'  },
        { icon: Instagram, href: socialLinks?.instagram, label: 'Instagram' },
    ].filter(s => s.href);

    return (
        <footer className="bg-[#020202] border-t border-white/5 text-sm">
            <div className="max-w-7xl mx-auto px-6 pt-14 pb-8">
                {/* Top grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
                    {/* Brand column */}
                    <div className="col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-indigo-400" />
                            </div>
                            <span className="text-lg font-bold text-white">{brandName}</span>
                        </div>
                        <p className="text-neutral-500 text-sm leading-relaxed max-w-[200px]">{tagline}</p>

                        {/* Social icons */}
                        {socials.length > 0 && (
                            <div className="flex items-center gap-3 mt-6">
                                {socials.map(({ icon: Icon, href, label }) => (
                                    <a
                                        key={label}
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={label}
                                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
                                    >
                                        <Icon className="w-4 h-4" />
                                    </a>
                                ))}
                            </div>
                        )}

                        {/* Default socials if none configured */}
                        {socials.length === 0 && (
                            <div className="flex items-center gap-3 mt-6">
                                {[Twitter, Github, Linkedin].map((Icon, i) => (
                                    <a
                                        key={i}
                                        href="#"
                                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
                                    >
                                        <Icon className="w-4 h-4" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Link groups */}
                    {links.map((group, idx) => (
                        <div key={idx}>
                            <h4 className="font-semibold text-white mb-4 text-xs uppercase tracking-wider">
                                {group.label}
                            </h4>
                            <ul className="space-y-2.5">
                                {group.items.map((item, i) => {
                                    const label = typeof item === 'string' ? item : item.label;
                                    const href  = typeof item === 'string' ? '#'  : (item.href || '#');
                                    return (
                                        <li key={i}>
                                            <a href={href} className="text-neutral-500 hover:text-white transition-colors">
                                                {label}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="pt-6 border-t border-white/5">
                    <p className="text-neutral-600 text-xs">{copyrightText}</p>

                    {/* Disclaimer */}
                    {disclaimer && (
                        <p className="text-neutral-700 text-xs mt-3 max-w-3xl leading-relaxed">
                            {disclaimer}
                        </p>
                    )}
                </div>
            </div>
        </footer>
    );
};
