
import React, { useState, useEffect } from 'react';
import { SectionNode } from '../types/ast';
import { X, Save } from 'lucide-react';

interface PropertyPanelProps {
    section: SectionNode;
    onUpdate: (props: any) => void;
    onClose: () => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ section, onUpdate, onClose }) => {
    // Local state for form handling to avoid excessive re-renders on every keystroke
    const [formData, setFormData] = useState<any>(section.props);
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Update local state when selection changes
    useEffect(() => {
        setFormData(section.props);
        setJsonError(null);
    }, [section.id]);

    const handleChange = (key: string, value: any) => {
        const newData = { ...formData, [key]: value };
        setFormData(newData);
        // Live update? Or wait for save? 
        // For better UX, live update is preferred, but might be slow for large trees.
        // Let's try live update for simple fields.
        onUpdate(newData);
    };

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        try {
            const parsed = JSON.parse(e.target.value);
            setFormData(parsed);
            setJsonError(null);
            onUpdate(parsed);
        } catch (err) {
            setJsonError('Invalid JSON');
        }
    };

    const renderFields = () => {
        switch (section.type) {
            case 'Hero':
                return (
                    <div className="space-y-4">
                        <Field label="Title" value={formData.title} onChange={(v) => handleChange('title', v)} />
                        <Field label="Subtitle" value={formData.subtitle} onChange={(v) => handleChange('subtitle', v)} type="textarea" />
                        <div className="grid grid-cols-2 gap-2">
                            <Field label="CTA Text" value={formData.ctaText} onChange={(v) => handleChange('ctaText', v)} />
                            <Field label="CTA Link" value={formData.ctaLink} onChange={(v) => handleChange('ctaLink', v)} />
                        </div>
                        <Field label="Background Image URL" value={formData.backgroundImage} onChange={(v) => handleChange('backgroundImage', v)} />
                    </div>
                );
            case 'CTA':
                return (
                    <div className="space-y-4">
                        <Field label="Title" value={formData.title} onChange={(v) => handleChange('title', v)} />
                        <Field label="Description" value={formData.description} onChange={(v) => handleChange('description', v)} type="textarea" />
                        <div className="grid grid-cols-2 gap-2">
                            <Field label="CTA Text" value={formData.ctaText} onChange={(v) => handleChange('ctaText', v)} />
                            <Field label="CTA Link" value={formData.ctaLink} onChange={(v) => handleChange('ctaLink', v)} />
                        </div>
                    </div>
                );
            case 'Features':
            case 'Pricing':
            case 'Footer':
            default:
                // Fallback to JSON editor for complex or unknown types
                return (
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-neutral-400 uppercase">
                            Props (JSON)
                        </label>
                        <textarea
                            className="w-full h-96 bg-neutral-900 border border-white/10 rounded p-2 text-xs font-mono text-neutral-300 focus:outline-none focus:border-indigo-500"
                            defaultValue={JSON.stringify(formData, null, 2)}
                            onChange={handleJsonChange}
                        />
                        {jsonError && <p className="text-red-400 text-xs">{jsonError}</p>}
                    </div>
                );
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0A0A0A] border-l border-white/10 w-80 shadow-2xl z-50">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{section.type}</h3>
                    <p className="text-[10px] text-neutral-500 font-mono">{section.id}</p>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white">
                    <X size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {renderFields()}
            </div>

            <div className="p-4 border-t border-white/10 bg-[#0A0A0A]">
                <div className="text-[10px] text-neutral-500 text-center">
                    Edições são salvas automaticamente
                </div>
            </div>
        </div>
    );
};

// Helper Field Component
const Field = ({ label, value, onChange, type = 'text' }: { label: string, value: any, onChange: (val: string) => void, type?: 'text' | 'textarea' }) => (
    <div className="space-y-1">
        <label className="block text-xs font-medium text-neutral-400 uppercase">{label}</label>
        {type === 'textarea' ? (
            <textarea
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 min-h-[80px]"
            />
        ) : (
            <input
                type={type}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
        )}
    </div>
);
