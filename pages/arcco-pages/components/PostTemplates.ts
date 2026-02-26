
import { PostAST, SectionNode } from '../types/ast';

export const INITIAL_POST_TEMPLATES: PostAST[] = [
    {
        id: 'template-promo-1',
        format: 'square',
        meta: {
            title: 'Promoção Relâmpago',
            theme: 'dark',
            primaryColor: '#6366f1'
        },
        slides: [
            {
                id: 'slide-1',
                elements: [
                    {
                        id: 'bg-1',
                        type: 'ImageOverlay',
                        props: {
                            src: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop',
                            alt: 'Pizza Background',
                            opacity: 0.4
                        },
                        styles: {
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: '0'
                        }
                    },
                    {
                        id: 'text-1',
                        type: 'TextOverlay',
                        props: {
                            text: '50% OFF',
                            variant: 'h1',
                            align: 'center'
                        },
                        styles: {
                            position: 'absolute',
                            top: '30%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: 'white',
                            fontSize: '4rem',
                            fontWeight: '800',
                            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                            zIndex: '10'
                        }
                    },
                    {
                        id: 'text-2',
                        type: 'TextOverlay',
                        props: {
                            text: 'Só hoje na Pizzaria Arcco',
                            variant: 'p',
                            align: 'center'
                        },
                        styles: {
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#e0e7ff',
                            fontSize: '1.5rem',
                            fontWeight: '500',
                            zIndex: '10'
                        }
                    },
                    {
                        id: 'shape-1',
                        type: 'Shape',
                        props: {
                            shapeType: 'rectangle',
                            color: '#6366f1'
                        },
                        styles: {
                            position: 'absolute',
                            bottom: '10%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '80%',
                            height: '60px',
                            borderRadius: '12px',
                            zIndex: '5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }
                    },
                    {
                        id: 'text-cta',
                        type: 'TextOverlay',
                        props: {
                            text: 'PEÇA AGORA',
                            variant: 'button',
                            align: 'center'
                        },
                        styles: {
                            position: 'absolute',
                            bottom: '10%',
                            left: '50%',
                            transform: 'translate(-50%)',
                            color: 'white',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            zIndex: '15',
                            width: '100%',
                            textAlign: 'center',
                            lineHeight: '60px'
                        }
                    }
                ]
            }
        ]
    },
    {
        id: 'template-quote-1',
        format: 'portrait',
        meta: {
            title: 'Citação Inspiradora',
            theme: 'dark',
            primaryColor: '#a855f7'
        },
        slides: [
            {
                id: 'slide-1',
                elements: [
                    {
                        id: 'bg-gradient',
                        type: 'Shape',
                        props: {
                            shapeType: 'rectangle',
                            gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
                        },
                        styles: {
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            width: '100%',
                            height: '100%',
                            zIndex: '0'
                        }
                    },
                    {
                        id: 'quote-icon',
                        type: 'TextOverlay',
                        props: {
                            text: '"',
                            variant: 'h1'
                        },
                        styles: {
                            position: 'absolute',
                            top: '10%',
                            left: '10%',
                            color: 'rgba(255,255,255,0.2)',
                            fontSize: '8rem',
                            fontWeight: '900',
                            zIndex: '1'
                        }
                    },
                    {
                        id: 'text-quote',
                        type: 'TextOverlay',
                        props: {
                            text: 'O design não é apenas o que parece e o que se sente. O design é como funciona.',
                            variant: 'h2',
                            align: 'left'
                        },
                        styles: {
                            position: 'absolute',
                            top: '40%',
                            left: '10%',
                            right: '10%',
                            transform: 'translateY(-50%)',
                            color: 'white',
                            fontSize: '2rem',
                            lineHeight: '1.4',
                            fontWeight: '600',
                            fontStyle: 'italic',
                            zIndex: '10'
                        }
                    },
                    {
                        id: 'text-author',
                        type: 'TextOverlay',
                        props: {
                            text: '- Steve Jobs',
                            variant: 'p',
                            align: 'right'
                        },
                        styles: {
                            position: 'absolute',
                            top: '60%',
                            right: '10%',
                            color: '#a5b4fc',
                            fontSize: '1.2rem',
                            fontWeight: '400',
                            zIndex: '10'
                        }
                    }
                ]
            }
        ]
    }
];
