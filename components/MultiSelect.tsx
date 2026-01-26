import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectProps {
    label: string;
    icon: string;
    options: (string | { value: string; label: string })[];
    selected: string[];
    onChange: (selected: string[]) => void;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, icon, options, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value: string) => {
        const newSelected = selected.includes(value)
            ? selected.filter(s => s !== value)
            : [...selected, value];
        onChange(newSelected);
    };

    const isAllSelected = selected.length === 0;

    const displayValue = isAllSelected
        ? `${label}: TODOS`
        : `${label}: ${selected.length} ${selected.length === 1 ? 'SELECIONADO' : 'SELECIONADOS'}`;

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-11 pl-9 pr-10 rounded-xl border border-[#e5e7eb] dark:border-[#2a3644] bg-transparent text-[10px] focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[#111418] dark:text-white text-left font-bold transition-all hover:bg-gray-50 dark:hover:bg-[#22303e]"
            >
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#617289] dark:text-[#9ca3af] text-[18px]">{icon}</span>
                <span className="truncate block uppercase">{displayValue}</span>
                <span className={`material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#617289] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full min-w-[200px] bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 border-b border-[#e5e7eb] dark:border-[#2a3644] flex justify-between items-center bg-gray-50/50 dark:bg-[#22303e]/50">
                        <button
                            onClick={() => onChange([])}
                            className="text-[10px] font-bold text-primary hover:text-secondary uppercase underline px-1"
                        >
                            Limpar
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-[10px] font-bold text-[#617289] hover:text-[#111418] dark:hover:text-white uppercase px-1"
                        >
                            Fechar
                        </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                        {options.map((opt) => {
                            const val = typeof opt === 'string' ? opt : opt.value;
                            const lab = typeof opt === 'string' ? opt : opt.label;
                            const isSel = selected.includes(val);

                            return (
                                <div
                                    key={val}
                                    onClick={() => toggleOption(val)}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg cursor-pointer transition-colors group"
                                >
                                    <div className={`size-4 rounded border transition-all flex items-center justify-center ${isSel ? 'bg-primary border-primary' : 'border-[#e5e7eb] dark:border-[#2a3644] bg-transparent'}`}>
                                        {isSel && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
                                    </div>
                                    <span className={`text-[11px] font-bold uppercase truncate ${isSel ? 'text-primary' : 'text-[#617289] dark:text-[#9ca3af] group-hover:text-[#111418] dark:group-hover:text-white'}`}>
                                        {lab}
                                    </span>
                                </div>
                            );
                        })}
                        {options.length === 0 && (
                            <div className="p-4 text-center text-[#617289] text-[10px] font-bold italic">
                                Nenhuma opção disponível
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
