
import React from 'react';

export const FooterSection: React.FC<any> = (props) => {
    const {
        brandName = "Arcco",
        copyright = "© 2024 Arcco Inc. All rights reserved.",
        links = []
    } = props;

    // Default links if none provided
    const footerLinks = links.length > 0 ? links : [
        { label: "Products", items: ["Features", "Pricing", "Integrations"] },
        { label: "Company", items: ["About", "Careers", "Blog"] },
        { label: "Legal", items: ["Privacy", "Terms", "Security"] }
    ];

    return (
        <footer className="py-16 bg-[#020202] border-t border-white/5 text-sm">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
                    <div className="col-span-2 md:col-span-1">
                        <span className="text-xl font-bold text-white block mb-4">{brandName}</span>
                        <p className="text-neutral-500">Building the future of digital experiences.</p>
                    </div>

                    {footerLinks.map((group: any, idx: number) => (
                        <div key={idx}>
                            <h4 className="font-bold text-white mb-4">{group.label}</h4>
                            <ul className="space-y-2">
                                {group.items.map((item: string, i: number) => (
                                    <li key={i}>
                                        <a href="#" className="text-neutral-500 hover:text-white transition-colors">
                                            {item}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-neutral-600">{copyright}</p>
                    <div className="flex gap-6">
                        <i data-lucide="twitter" className="w-5 h-5 text-neutral-600 hover:text-white cursor-pointer transition-colors"></i>
                        <i data-lucide="github" className="w-5 h-5 text-neutral-600 hover:text-white cursor-pointer transition-colors"></i>
                        <i data-lucide="linkedin" className="w-5 h-5 text-neutral-600 hover:text-white cursor-pointer transition-colors"></i>
                    </div>
                </div>
            </div>
        </footer>
    );
};
