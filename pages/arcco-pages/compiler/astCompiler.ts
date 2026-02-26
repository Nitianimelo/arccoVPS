/**
 * AST Compiler — converte PageAST em HTML estático completo.
 *
 * Cada seção gera HTML que espelha visualmente o componente React correspondente.
 * O HTML gerado inclui:
 *   - Tailwind CSS via CDN
 *   - Google Fonts (Inter)
 *   - CSS customizado (keyframes marquee, gradient-text, glass, blobs)
 *   - JS inline para interatividade (hambúrguer do Navbar, FAQ accordion)
 */

import { PageAST, SectionNode } from '../types/ast';

// ─── CSS Base ───────────────────────────────────────────────────────────────

function getBaseCSS(): string {
    return `
        body { font-family: 'Inter', sans-serif; }

        .gradient-text {
            background: linear-gradient(135deg, #fff 30%, #a5b4fc 60%, #c084fc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .glass {
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        }

        @keyframes marquee-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .marquee-track { animation: marquee-scroll 20s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }

        @keyframes blob-pulse {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50%       { opacity: 0.6; transform: scale(1.05); }
        }
        .blob-anim { animation: blob-pulse 5s ease-in-out infinite; }

        @keyframes drawer-in {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
        }
        .drawer-enter { animation: drawer-in 0.28s cubic-bezier(0.4,0,0.2,1) both; }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #555; }
    `;
}

// ─── JS Base (interatividade inline) ────────────────────────────────────────

function getBaseJS(): string {
    return `
        // Navbar hambúrguer
        (function() {
            var btn = document.getElementById('nav-hamburger');
            var drawer = document.getElementById('nav-drawer');
            var overlay = document.getElementById('nav-overlay');
            if (!btn || !drawer) return;
            function open() { drawer.style.display='flex'; overlay.style.display='block'; }
            function close() { drawer.style.display='none'; overlay.style.display='none'; }
            btn.addEventListener('click', open);
            overlay.addEventListener('click', close);
            document.querySelectorAll('.nav-close-btn').forEach(function(el) { el.addEventListener('click', close); });
        })();

        // FAQ accordion
        (function() {
            document.querySelectorAll('.faq-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var answer = btn.nextElementSibling;
                    var icon = btn.querySelector('.faq-icon');
                    var isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';
                    // Close all
                    document.querySelectorAll('.faq-answer').forEach(function(a) {
                        a.style.maxHeight = '0px';
                        a.style.opacity = '0';
                    });
                    document.querySelectorAll('.faq-icon').forEach(function(ic) {
                        ic.style.transform = 'rotate(0deg)';
                    });
                    // Open clicked (if was closed)
                    if (!isOpen) {
                        answer.style.maxHeight = answer.scrollHeight + 'px';
                        answer.style.opacity = '1';
                        icon.style.transform = 'rotate(180deg)';
                    }
                });
            });
        })();
    `;
}

// ─── Section Compilers ──────────────────────────────────────────────────────

function esc(str: unknown): string {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function compileNavbar(props: any): string {
    const brandName = props.brandName || 'Arcco';
    const links: Array<{ label: string; href: string }> = props.links || [
        { label: 'Funcionalidades', href: '#features' },
        { label: 'Preços', href: '#pricing' },
        { label: 'FAQ', href: '#faq' },
    ];
    const ctaText = props.ctaText || 'Começar Agora';
    const ctaLink = props.ctaLink || '#';

    const linksHtml = links.map(l =>
        `<a href="${esc(l.href)}" class="text-sm font-medium text-neutral-400 hover:text-white transition-colors">${esc(l.label)}</a>`
    ).join('');

    const drawerLinks = links.map(l =>
        `<a href="${esc(l.href)}" class="nav-close-btn px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-300 hover:text-white hover:bg-white/5 transition-colors block">${esc(l.label)}</a>`
    ).join('');

    return `
<nav class="sticky top-0 z-50 w-full backdrop-blur-md bg-black/50 border-b border-white/10">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <a href="#" class="flex items-center gap-2 shrink-0 font-bold text-lg text-white tracking-tight">
            <svg class="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            ${esc(brandName)}
        </a>
        <div class="hidden md:flex items-center gap-8 flex-1 justify-center">
            ${linksHtml}
        </div>
        <a href="${esc(ctaLink)}" class="hidden md:inline-flex shrink-0 px-5 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-neutral-100 transition-all transform hover:scale-105">
            ${esc(ctaText)}
        </a>
        <button id="nav-hamburger" class="md:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
        </button>
    </div>
</nav>

<!-- Mobile drawer overlay -->
<div id="nav-overlay" style="display:none" class="fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm"></div>
<!-- Mobile drawer -->
<aside id="nav-drawer" style="display:none" class="drawer-enter fixed top-0 right-0 z-[100] h-full w-72 bg-[#0a0a0a] border-l border-white/10 shadow-2xl flex-col p-6 gap-4">
    <div class="flex items-center justify-between mb-4">
        <span class="font-bold text-white">${esc(brandName)}</span>
        <button class="nav-close-btn p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
    </div>
    <div class="w-full h-px bg-white/10 mb-2"></div>
    <nav class="flex flex-col gap-1">${drawerLinks}</nav>
    <div class="mt-auto pt-6">
        <a href="${esc(ctaLink)}" class="block w-full text-center px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all">
            ${esc(ctaText)}
        </a>
    </div>
</aside>`;
}

function compileHero(props: any): string {
    const title = props.title || 'Welcome to our Platform';
    const subtitle = props.subtitle || 'The best solution for your business needs.';
    const ctaText = props.ctaText || 'Get Started';
    const ctaLink = props.ctaLink || '#';
    const secondaryCtaText = props.secondaryCtaText || '';
    const secondaryCtaLink = props.secondaryCtaLink || '#';
    const backgroundImage = props.backgroundImage || '';

    const blobsBg = backgroundImage ? '' : `
        <div class="blob-anim absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/40 rounded-full" style="filter:blur(120px);animation-duration:4s;"></div>
        <div class="blob-anim absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full" style="filter:blur(120px);animation-duration:6s;animation-delay:2s;"></div>
        <div class="blob-anim absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-pink-600/20 rounded-full" style="filter:blur(100px);animation-duration:8s;animation-delay:1s;"></div>`;

    const bgImage = backgroundImage ? `
        <img src="${esc(backgroundImage)}" alt="Hero Background" class="absolute inset-0 w-full h-full object-cover opacity-30">
        <div class="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent"></div>` : '';

    const secondaryBtn = secondaryCtaText ? `
        <a href="${esc(secondaryCtaLink)}" class="inline-flex items-center justify-center px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-lg transition-all backdrop-blur-sm w-full sm:w-auto">
            ${esc(secondaryCtaText)}
        </a>` : '';

    return `
<section class="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#050505] text-white">
    <div class="absolute inset-0 overflow-hidden" style="z-index:0;">${blobsBg}${bgImage}</div>
    <div class="relative max-w-5xl mx-auto px-6 text-center" style="z-index:10;">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-8">
            <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Nova Era do Design Digital
        </div>
        <h1 class="gradient-text text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">${esc(title)}</h1>
        <p class="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">${esc(subtitle)}</p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="${esc(ctaLink)}" class="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg w-full sm:w-auto justify-center">
                ${esc(ctaText)}
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
            </a>
            ${secondaryBtn}
        </div>
    </div>
</section>`;
}

function compileMarquee(props: any): string {
    const items: string[] = props.items || [
        '🚀 Rápido', '🔒 Seguro', '⚡ Inovador', '🎯 Alta Conversão',
        '💎 Premium Design', '🌐 Multi-plataforma', '📈 Alta Performance', '🤖 Powered by AI',
    ];
    const speed = props.speed || 20;
    const bgColor = props.bgColor || '#050505';

    const track = [...items, ...items].map((item, i) =>
        `<span class="text-sm font-semibold text-neutral-400 tracking-wide">${esc(item)}<span class="ml-10 text-neutral-700">•</span></span>`
    ).join('');

    return `
<div class="relative overflow-hidden border-y border-white/5 py-5" style="background:${esc(bgColor)}">
    <style>
        @keyframes marquee-scroll-${speed} {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .marquee-track-${speed} { animation: marquee-scroll-${speed} ${speed}s linear infinite; }
    </style>
    <div style="position:absolute;left:0;top:0;height:100%;width:96px;background:linear-gradient(to right,${bgColor},transparent);z-index:10;pointer-events:none;"></div>
    <div style="position:absolute;right:0;top:0;height:100%;width:96px;background:linear-gradient(to left,${bgColor},transparent);z-index:10;pointer-events:none;"></div>
    <div class="marquee-track-${speed} flex items-center gap-10 whitespace-nowrap">
        ${track}
    </div>
</div>`;
}

function compileFeatures(props: any): string {
    const title = props.title || 'Our Features';
    const subtitle = props.subtitle || '';
    const items: Array<{ icon?: string; title: string; description: string }> = props.items || [];
    const columns: number = props.columns || 3;

    const colClass: Record<number, string> = {
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    };

    const ACCENT_COLORS = [
        { bg: 'background:rgba(99,102,241,0.1)', text: 'color:#818cf8' },
        { bg: 'background:rgba(168,85,247,0.1)', text: 'color:#c084fc' },
        { bg: 'background:rgba(236,72,153,0.1)', text: 'color:#f472b6' },
        { bg: 'background:rgba(16,185,129,0.1)', text: 'color:#34d399' },
        { bg: 'background:rgba(6,182,212,0.1)',  text: 'color:#22d3ee' },
        { bg: 'background:rgba(245,158,11,0.1)', text: 'color:#fbbf24' },
    ];

    const cards = items.map((item, i) => {
        const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
        return `
        <div class="group p-8 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-2 cursor-default"
             style="background:#0A0A0A;">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                 style="${accent.bg}">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="${accent.text}">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
            </div>
            <h3 class="text-xl font-bold text-white mb-3">${esc(item.title)}</h3>
            <p class="text-neutral-400 leading-relaxed text-sm">${esc(item.description)}</p>
        </div>`;
    }).join('');

    return `
<section id="features" class="py-24 border-t border-white/5" style="background:#050505;">
    <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16">
            <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">${esc(title)}</h2>
            ${subtitle ? `<p class="text-neutral-400 max-w-2xl mx-auto">${esc(subtitle)}</p>` : ''}
        </div>
        <div class="grid ${colClass[columns] || colClass[3]} gap-6">${cards}</div>
    </div>
</section>`;
}

function compilePricing(props: any): string {
    const title = props.title || 'Planos Simples e Transparentes';
    const subtitle = props.subtitle || '';
    const plans: Array<{
        name: string; price: string; period?: string;
        features: string[]; isPopular?: boolean; ctaText: string;
    }> = props.plans || [];

    const cards = plans.map(plan => {
        const popular = plan.isPopular;
        const features = (plan.features || []).map(f =>
            `<li class="flex items-start gap-3">
                <div class="shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center" style="${popular ? 'background:rgba(99,102,241,0.2);color:#818cf8' : 'background:rgba(255,255,255,0.1);color:#9ca3af'}">
                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                    </svg>
                </div>
                <span class="text-neutral-300 text-sm leading-snug">${esc(f)}</span>
            </li>`
        ).join('');

        const badgeHtml = popular ? `
            <div style="position:absolute;top:-16px;left:50%;transform:translateX(-50%);">
                <div class="inline-flex items-center gap-1.5 px-4 py-1.5 text-white text-xs font-bold rounded-full"
                     style="background:linear-gradient(135deg,#4f46e5,#9333ea);box-shadow:0 4px 20px rgba(99,102,241,0.4);">
                    ★ Mais Popular
                </div>
            </div>` : '';

        const cardStyle = popular
            ? 'background:#0d0d0f;border:1px solid rgba(99,102,241,0.5);transform:scale(1.05);box-shadow:0 0 60px rgba(99,102,241,0.25);'
            : 'background:#050505;border:1px solid rgba(255,255,255,0.05);';

        const btnStyle = popular
            ? 'background:#4f46e5;color:white;'
            : 'background:rgba(255,255,255,0.05);color:white;border:1px solid rgba(255,255,255,0.1);';

        return `
        <div class="relative p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2" style="${cardStyle}">
            ${badgeHtml}
            <h3 class="text-xl font-bold text-white mb-1">${esc(plan.name)}</h3>
            <div class="flex items-baseline gap-1 my-4">
                <span class="text-4xl font-extrabold" style="${popular ? 'color:#a5b4fc' : 'color:white'}">${esc(plan.price)}</span>
                ${plan.period ? `<span class="text-neutral-500 text-sm">/${esc(plan.period)}</span>` : ''}
            </div>
            <div class="w-full h-px mb-6" style="${popular ? 'background:rgba(99,102,241,0.2)' : 'background:rgba(255,255,255,0.05)'}"></div>
            <ul class="space-y-3 mb-8">${features}</ul>
            <button class="w-full py-3.5 rounded-xl font-bold text-sm transition-all" style="${btnStyle}">
                ${esc(plan.ctaText)}
            </button>
        </div>`;
    }).join('');

    return `
<section id="pricing" class="py-24 border-t border-white/5 relative overflow-hidden" style="background:#0A0A0A;">
    <div class="absolute inset-0 pointer-events-none" style="z-index:0;">
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:300px;background:rgba(99,102,241,0.1);border-radius:50%;filter:blur(100px);"></div>
    </div>
    <div class="max-w-7xl mx-auto px-6 relative" style="z-index:10;">
        <div class="text-center mb-16">
            <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">${esc(title)}</h2>
            ${subtitle ? `<p class="text-neutral-400 max-w-2xl mx-auto">${esc(subtitle)}</p>` : ''}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">${cards}</div>
    </div>
</section>`;
}

function compileFAQ(props: any): string {
    const title = props.title || 'Perguntas Frequentes';
    const subtitle = props.subtitle || '';
    const items: Array<{ question: string; answer: string }> = props.items || [];

    const accordions = items.map((item, i) => `
        <div class="rounded-2xl border border-white/5 overflow-hidden transition-all" style="background:#0a0a0a;" id="faq-item-${i}">
            <button class="faq-btn w-full flex items-center justify-between gap-4 px-6 py-5 text-left" style="cursor:pointer;background:none;border:none;">
                <span class="font-semibold text-sm md:text-base text-white">${esc(item.question)}</span>
                <svg class="faq-icon w-5 h-5 text-neutral-500 shrink-0 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            <div class="faq-answer overflow-hidden transition-all duration-300" style="max-height:0;opacity:0;">
                <p class="px-6 pb-5 text-sm text-neutral-400 leading-relaxed">${esc(item.answer)}</p>
            </div>
        </div>`
    ).join('');

    return `
<section id="faq" class="py-24 border-t border-white/5" style="background:#050505;">
    <div class="max-w-3xl mx-auto px-6">
        <div class="text-center mb-14">
            <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">${esc(title)}</h2>
            ${subtitle ? `<p class="text-neutral-400 max-w-xl mx-auto">${esc(subtitle)}</p>` : ''}
        </div>
        <div class="flex flex-col gap-3">${accordions}</div>
    </div>
</section>`;
}

function compileCTA(props: any): string {
    const title = props.title || 'Pronto para transformar seu negócio?';
    const description = props.description || 'Junte-se a milhares de empresas que já usam nossa plataforma.';
    const ctaText = props.ctaText || 'Começar Agora — Grátis';
    const ctaLink = props.ctaLink || '#';
    const secondaryCtaText = props.secondaryCtaText || '';
    const secondaryCtaLink = props.secondaryCtaLink || '#';

    const secondaryBtn = secondaryCtaText ? `
        <a href="${esc(secondaryCtaLink)}" class="inline-flex items-center justify-center px-8 py-4 border border-white/10 text-white rounded-full font-semibold text-lg transition-all w-full sm:w-auto"
           style="background:rgba(255,255,255,0.05);">
            ${esc(secondaryCtaText)}
        </a>` : '';

    return `
<section class="relative py-28 border-t border-white/5 overflow-hidden">
    <div class="absolute inset-0" style="background:linear-gradient(135deg,#05050a,#0d0a1a,#050505);z-index:0;"></div>
    <div class="absolute inset-0 pointer-events-none" style="z-index:0;overflow:hidden;">
        <div class="blob-anim absolute" style="top:-10%;left:10%;width:500px;height:500px;background:rgba(99,102,241,0.2);border-radius:50%;filter:blur(100px);animation-duration:5s;"></div>
        <div class="blob-anim absolute" style="bottom:-10%;right:10%;width:400px;height:400px;background:rgba(168,85,247,0.15);border-radius:50%;filter:blur(100px);animation-duration:7s;animation-delay:1s;"></div>
    </div>
    <div class="absolute top-0 left-0 right-0 h-px" style="background:linear-gradient(to right,transparent,rgba(99,102,241,0.5),transparent);"></div>
    <div class="relative max-w-4xl mx-auto px-6 text-center" style="z-index:10;">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-8"
             style="background:rgba(99,102,241,0.1);">
            ✨ Comece hoje mesmo
        </div>
        <h2 class="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">${esc(title)}</h2>
        <p class="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">${esc(description)}</p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="${esc(ctaLink)}" class="inline-flex items-center gap-2 px-10 py-4 bg-white text-black font-bold text-lg rounded-full hover:bg-neutral-100 transition-all transform hover:scale-105 w-full sm:w-auto justify-center"
               style="box-shadow:0 0 40px rgba(255,255,255,0.15);">
                ${esc(ctaText)}
            </a>
            ${secondaryBtn}
        </div>
        <p class="mt-8 text-xs text-neutral-600">Sem cartão de crédito • Plano grátis disponível • Cancele quando quiser</p>
    </div>
</section>`;
}

function compileFooter(props: any): string {
    const brandName = props.brandName || 'Arcco';
    const tagline = props.tagline || 'Construindo o futuro das experiências digitais.';
    const copyright = props.copyright || `© ${new Date().getFullYear()} ${brandName}. Todos os direitos reservados.`;
    const disclaimer = props.disclaimer || '';
    const links: Array<{ label: string; items: Array<string | { label: string; href?: string }> }> = props.links || [
        { label: 'Produto',  items: ['Funcionalidades', 'Preços', 'Integrações'] },
        { label: 'Empresa',  items: ['Sobre', 'Blog', 'Carreiras'] },
        { label: 'Legal',    items: ['Privacidade', 'Termos', 'Segurança'] },
    ];

    const linkCols = links.map(group => {
        const items = group.items.map(item => {
            const label = typeof item === 'string' ? item : item.label;
            const href  = typeof item === 'string' ? '#' : (item.href || '#');
            return `<li><a href="${esc(href)}" class="text-neutral-500 hover:text-white transition-colors">${esc(label)}</a></li>`;
        }).join('');
        return `
        <div>
            <h4 class="font-semibold text-white mb-4 text-xs uppercase tracking-wider">${esc(group.label)}</h4>
            <ul class="space-y-2.5">${items}</ul>
        </div>`;
    }).join('');

    const disclaimerHtml = disclaimer
        ? `<p class="text-neutral-700 text-xs mt-3 max-w-3xl leading-relaxed">${esc(disclaimer)}</p>`
        : '';

    return `
<footer class="border-t border-white/5 text-sm" style="background:#020202;">
    <div class="max-w-7xl mx-auto px-6 pt-14 pb-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div class="col-span-2 md:col-span-1">
                <span class="text-xl font-bold text-white block mb-3">${esc(brandName)}</span>
                <p class="text-neutral-500 text-sm leading-relaxed max-w-[200px]">${esc(tagline)}</p>
                <div class="flex items-center gap-3 mt-6">
                    ${['M23 3a10.9 10.9 0 0 1-3.14 1.53A4.48 4.48 0 0 0 16 2a4.48 4.48 0 0 0-4.48 4.48A12.76 12.76 0 0 1 3 4s-4 9 5 13A11.28 11.28 0 0 1 1 20.05c9 5 20 0 20-11.5 0-.28 0-.56-.03-.84A7.72 7.72 0 0 0 23 3z',
                       'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22',
                       'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'
                    ].map(d => `
                    <a href="#" class="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-white transition-colors" style="background:rgba(255,255,255,0.05);">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${d}"/>
                        </svg>
                    </a>`).join('')}
                </div>
            </div>
            ${linkCols}
        </div>
        <div class="pt-6 border-t border-white/5">
            <p class="text-neutral-600 text-xs">${esc(copyright)}</p>
            ${disclaimerHtml}
        </div>
    </div>
</footer>`;
}

// ─── Section Dispatcher ─────────────────────────────────────────────────────

function compileSectionToHtml(section: SectionNode): string {
    const { type, props } = section;
    switch (type) {
        case 'Navbar':   return compileNavbar(props);
        case 'Hero':     return compileHero(props);
        case 'Marquee':  return compileMarquee(props);
        case 'Features': return compileFeatures(props);
        case 'Pricing':  return compilePricing(props);
        case 'FAQ':      return compileFAQ(props);
        case 'CTA':      return compileCTA(props);
        case 'Footer':   return compileFooter(props);
        default:
            return `<!-- Section type "${type}" not compiled -->`;
    }
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function compileAstToHtml(ast: PageAST): string {
    const title = ast?.meta?.title || 'Página';
    const sectionsHtml = (ast.sections || []).map(compileSectionToHtml).join('\n');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        ${getBaseCSS()}
    </style>
</head>
<body class="bg-[#050505] text-white overflow-x-hidden antialiased selection:bg-indigo-500 selection:text-white">

${sectionsHtml}

<script>
${getBaseJS()}
</script>
</body>
</html>`;
}
