
import React, { useState, useMemo } from 'react';
import { Property, IptuStatus } from '../types';
import { parseLocalDate } from '../utils/iptu';

interface CalendarViewProps {
    properties: Property[];
    onSelectProperty: (id: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ properties, onSelectProperty }) => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showAllEvents, setShowAllEvents] = useState(false);

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const iptuEvents = useMemo(() => {
        const events: any[] = [];
        properties.forEach(property => {
            property.units.forEach(unit => {
                if (unit.dueDate) {
                    events.push({
                        id: `${property.id}-${unit.sequential}-${unit.year}`,
                        propertyId: property.id,
                        propertyName: property.name,
                        city: property.city,
                        sequential: unit.sequential,
                        dueDate: parseLocalDate(unit.dueDate) || new Date(),
                        value: unit.chosenMethod === 'Parcelado' ? unit.installmentValue : unit.singleValue,
                        status: unit.status,
                        year: unit.year
                    });
                }
            });
        });
        return events;
    }, [properties]);

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
        setCurrentDate(newDate);
        setSelectedDate(null);
        setShowAllEvents(false);
    };

    // Grid View Helper Functions
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const monthEvents = useMemo(() => {
        return iptuEvents.filter(e =>
            e.dueDate.getMonth() === currentDate.getMonth() &&
            e.dueDate.getFullYear() === currentDate.getFullYear()
        ).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    }, [iptuEvents, currentDate]);

    const activeDateEvents = useMemo(() => {
        if (!selectedDate) return [];
        return iptuEvents.filter(e =>
            e.dueDate.getDate() === selectedDate.getDate() &&
            e.dueDate.getMonth() === selectedDate.getMonth() &&
            e.dueDate.getFullYear() === selectedDate.getFullYear()
        );
    }, [iptuEvents, selectedDate]);

    const renderGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 border border-gray-100 dark:border-[#2a3644] bg-gray-50/30 dark:bg-gray-800/10"></div>);
        }

        // Actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayEvents = iptuEvents.filter(e =>
                e.dueDate.getDate() === day &&
                e.dueDate.getMonth() === month &&
                e.dueDate.getFullYear() === year
            );

            const isToday = new Date().toDateString() === date.toDateString();
            const isSelected = selectedDate?.toDateString() === date.toDateString();

            // Get unique cities for this day
            const cities = Array.from(new Set(dayEvents.map(e => e.city))).filter(Boolean);

            days.push(
                <div
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    className={`h-24 border border-gray-100 dark:border-[#2a3644] p-2 flex flex-col gap-1 overflow-hidden transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-[#22303e] ${isSelected ? 'ring-2 ring-primary ring-inset bg-primary/5' :
                        isToday ? 'bg-primary/5' : 'bg-white dark:bg-transparent'
                        }`}
                >
                    <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-[11px] font-bold leading-none ${isSelected ? 'text-primary' :
                            isToday ? 'bg-primary text-white size-5 rounded-full flex items-center justify-center' :
                                'text-[#617289] dark:text-[#9ca3af]'
                            }`}>
                            {day}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-1 overflow-y-auto no-scrollbar">
                        {cities.map((city, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[9px] font-black rounded-md truncate max-w-full uppercase tracking-tighter shadow-sm"
                                title={city}
                            >
                                {city}
                            </span>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1a2634] rounded-2xl border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm overflow-hidden animate-in fade-in duration-500">
                    <div className="grid grid-cols-7 border-b border-[#e5e7eb] dark:border-[#2a3644]">
                        {daysOfWeek.map(day => (
                            <div key={day} className="py-2.5 text-center text-[10px] font-bold text-[#617289] dark:text-[#9ca3af] uppercase tracking-widest bg-gray-50/50 dark:bg-[#22303e]/50">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {days}
                    </div>
                </div>

                {/* List below grid for selected day or full month */}
                <div className="bg-white dark:bg-[#1a2634] rounded-2xl border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm overflow-hidden animate-in slide-in-from-top-4 duration-500">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-[#22303e] border-b border-[#e5e7eb] dark:border-[#2a3644] flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[#111418] dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[20px]">list_alt</span>
                            {selectedDate
                                ? `Vencimentos em ${selectedDate.getDate()} de ${months[selectedDate.getMonth()]} de ${selectedDate.getFullYear()}`
                                : `Todos os Vencimentos de ${months[currentDate.getMonth()]} de ${currentDate.getFullYear()}`
                            }
                        </h3>
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest">
                            {(selectedDate ? activeDateEvents : monthEvents).length} Registros
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-[#e5e7eb] dark:border-[#2a3644] bg-white dark:bg-[#1a2634]">
                                <tr>
                                    {!selectedDate && <th className="px-6 py-3 text-[10px] font-bold text-[#617289] uppercase tracking-widest">Data</th>}
                                    <th className="px-6 py-3 text-[10px] font-bold text-[#617289] uppercase tracking-widest">Imóvel</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-[#617289] uppercase tracking-widest">Cidade</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-[#617289] uppercase tracking-widest">Sequencial</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-[#617289] uppercase tracking-widest">Valor</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-[#617289] uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-3 text-right text-[10px] font-bold text-[#617289] uppercase tracking-widest">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#2a3644]">
                                {(selectedDate ? activeDateEvents : monthEvents).length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-[#617289] font-medium text-sm italic">
                                            Nenhum vencimento encontrado para este período.
                                        </td>
                                    </tr>
                                ) : (
                                    (selectedDate ? activeDateEvents : monthEvents)
                                        .slice(0, showAllEvents ? undefined : 5)
                                        .map((event: any) => (
                                            <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-[#22303e] transition-colors group">
                                                {!selectedDate && (
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-bold text-[#111418] dark:text-white">
                                                            {event.dueDate.getDate().toString().padStart(2, '0')}/{(event.dueDate.getMonth() + 1).toString().padStart(2, '0')}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-semibold text-[#111418] dark:text-white truncate block max-w-[200px]" title={event.propertyName}>
                                                        {event.propertyName}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-bold text-primary uppercase">{event.city}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[11px] font-bold text-primary">{event.sequential}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-bold text-[#111418] dark:text-white">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(event.value)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${event.status === IptuStatus.PAID ? 'bg-emerald-100 text-emerald-700' :
                                                        event.status === IptuStatus.OPEN ? 'bg-red-100 text-red-700' :
                                                            'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {event.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => onSelectProperty(event.propertyId)}
                                                        className="p-1 px-3 text-[10px] font-bold text-primary hover:bg-primary hover:text-white rounded-lg transition-all border border-primary/20 uppercase"
                                                    >
                                                        Detalhes
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {(selectedDate ? activeDateEvents : monthEvents).length > 5 && (
                        <div className="p-4 bg-gray-50/50 dark:bg-[#22303e]/30 border-t border-[#e5e7eb] dark:border-[#2a3644] text-center">
                            <button
                                onClick={() => setShowAllEvents(!showAllEvents)}
                                className="text-xs font-bold text-primary hover:underline uppercase tracking-wider flex items-center justify-center gap-2 mx-auto"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    {showAllEvents ? 'expand_less' : 'expand_more'}
                                </span>
                                {showAllEvents ? 'Mostrar menos' : 'Mostrar mais'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderList = () => {
        return (
            <div className="bg-white dark:bg-[#1a2634] rounded-2xl border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm overflow-hidden animate-in fade-in duration-500">
                <div className="px-6 py-4 bg-gray-50 dark:bg-[#22303e] border-b border-[#e5e7eb] dark:border-[#2a3644] flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#111418] dark:text-white uppercase tracking-wider">
                        Lançamentos de {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h3>
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest">
                        {monthEvents.length} Lançamentos
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-[#e5e7eb] dark:border-[#2a3644] bg-white dark:bg-[#1a2634]">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold text-[#617289] uppercase tracking-widest">Data</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-[#617289] uppercase tracking-widest">Imóvel</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-[#617289] uppercase tracking-widest">Cidade</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-[#617289] uppercase tracking-widest">Sequencial</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-[#617289] uppercase tracking-widest">Valor</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-[#617289] uppercase tracking-widest">Status</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-[#617289] uppercase tracking-widest">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#2a3644]">
                            {monthEvents.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-[#617289] font-medium text-sm italic">
                                        Nenhum vencimento encontrado para este mês.
                                    </td>
                                </tr>
                            ) : (
                                monthEvents.map((event: any) => (
                                    <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-[#22303e] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-[#111418] dark:text-white">
                                                    {event.dueDate.getDate().toString().padStart(2, '0')}/{(event.dueDate.getMonth() + 1).toString().padStart(2, '0')}
                                                </span>
                                                <span className="text-[10px] text-[#617289] font-medium uppercase">{daysOfWeek[event.dueDate.getDay()]}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-[#111418] dark:text-white truncate block max-w-[200px]" title={event.propertyName}>
                                                {event.propertyName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-primary uppercase">{event.city}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[11px] font-bold text-primary">{event.sequential}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-[#111418] dark:text-white">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(event.value)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${event.status === IptuStatus.PAID ? 'bg-emerald-100 text-emerald-700' :
                                                event.status === IptuStatus.OPEN ? 'bg-red-100 text-red-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                {event.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => onSelectProperty(event.propertyId)}
                                                className="p-1 px-3 text-[10px] font-bold text-primary hover:bg-primary hover:text-white rounded-lg transition-all border border-primary/20 uppercase"
                                            >
                                                Detalhes
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div>
                    <h1 className="text-[#111418] dark:text-white text-3xl font-semibold tracking-tight">Calendário de Vencimentos</h1>
                    <p className="text-[#617289] dark:text-[#9ca3af] mt-1 font-medium">Acompanhamento centralizado de todos os compromissos de IPTU.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-gray-100 dark:bg-[#22303e] p-1 rounded-xl border border-[#e5e7eb] dark:border-[#2a3644] h-11">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center gap-2 px-4 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-primary text-[#111418] dark:text-white shadow-sm' : 'text-[#617289] dark:text-[#9ca3af]'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">grid_view</span>
                            GRADE
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-2 px-4 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-primary text-[#111418] dark:text-white shadow-sm' : 'text-[#617289] dark:text-[#9ca3af]'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                            LISTA
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] rounded-xl px-2 h-11">
                        <button
                            onClick={() => changeMonth(-1)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-[#2a3644] rounded-lg transition-colors text-primary"
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <span className="text-sm font-bold text-[#111418] dark:text-white w-36 text-center uppercase">
                            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </span>
                        <button
                            onClick={() => changeMonth(1)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-[#2a3644] rounded-lg transition-colors text-primary"
                        >
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'grid' ? renderGrid() : renderList()}
        </div>
    );
};

export default CalendarView;
