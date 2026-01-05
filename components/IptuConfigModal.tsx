
import React, { useState, useMemo } from 'react';
import { Property, PropertyUnit, Tenant, PaymentMethod, IptuStatus } from '../types';

interface IptuConfigModalProps {
    property: Property;
    onClose: () => void;
    onSubmit: (propertyId: string, units: PropertyUnit[], tenants: Tenant[], baseYear: number) => void;
}

const IptuConfigModal: React.FC<IptuConfigModalProps> = ({ property, onClose, onSubmit }) => {
    const [baseYear, setBaseYear] = useState<number>(property.baseYear || new Date().getFullYear());
    const [units, setUnits] = useState<PropertyUnit[]>(property.units || []);
    const [tenants, setTenants] = useState<Tenant[]>(property.tenants || []);

    const handleUnitChange = (index: number, field: keyof PropertyUnit, value: any) => {
        const newUnits = [...units];
        newUnits[index] = { ...newUnits[index], [field]: value } as PropertyUnit;
        setUnits(newUnits);
    };

    const addUnit = () => {
        setUnits([{
            sequential: '',
            singleValue: 0,
            installmentValue: 0,
            installmentsCount: 1,
            year: baseYear,
            chosenMethod: 'Cota Única',
            status: IptuStatus.OPEN
        }, ...units]);
    };

    const removeUnit = (index: number) => {
        setUnits(units.filter((_, i) => i !== index));
    };

    const addTenant = () => {
        setTenants([{
            id: crypto.randomUUID(),
            name: '',
            year: baseYear,
            occupiedArea: 0,
            isSingleTenant: false
        }, ...tenants]);
    };

    const removeTenant = (id: string) => {
        setTenants(tenants.filter(t => t.id !== id));
    };

    const handleTenantChange = (id: string, field: keyof Tenant, value: any) => {
        setTenants(tenants.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const subtotals = useMemo(() => {
        const activeUnits = units.filter(u => u.year === baseYear);
        const total = activeUnits.reduce((acc, unit) => {
            const value = unit.chosenMethod === 'Parcelado' ? (Number(unit.installmentValue) || 0) : (Number(unit.singleValue) || 0);
            return acc + value;
        }, 0);
        return { total };
    }, [units, baseYear]);

    const tenantCalculations = useMemo(() => {
        const yearTenants = tenants.filter(t => t.year === baseYear);
        const singleTenant = yearTenants.find(t => t.isSingleTenant);

        if (singleTenant) {
            return yearTenants.map(t => ({
                ...t,
                percentage: t.id === singleTenant.id ? 100 : 0,
                apportionment: t.id === singleTenant.id ? subtotals.total : 0
            }));
        }

        const totalArea = yearTenants.reduce((acc, t) => acc + (Number(t.occupiedArea) || 0), 0);
        return yearTenants.map(t => {
            const percentage = totalArea > 0 ? (t.occupiedArea / totalArea) * 100 : 0;
            const apportionment = totalArea > 0 ? (t.occupiedArea / totalArea) * subtotals.total : 0;
            return { ...t, percentage, apportionment };
        });
    }, [tenants, baseYear, subtotals.total]);

    const hasSingleTenant = useMemo(() => {
        return tenants.some(t => t.year === baseYear && t.isSingleTenant);
    }, [tenants, baseYear]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(property.id, units, tenants, baseYear);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 font-sans">
            <div className="bg-white dark:bg-[#1a2634] w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2a3644] overflow-hidden">
                <header className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-[#2a3644]">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined">settings_suggest</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#111418] dark:text-white uppercase tracking-tight">Configuração de IPTU</h2>
                            <p className="text-xs text-[#617289] dark:text-[#9ca3af] font-semibold">{property.name} - Gestão de Sequenciais e Locatários</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3644]">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                    <div className="flex flex-col gap-1.5 p-4 bg-primary/5 rounded-xl border border-primary/20">
                        <label className="text-xs font-black text-primary uppercase tracking-wider">Ano de Referência das Configurações</label>
                        <input
                            required
                            type="number"
                            value={baseYear}
                            onChange={(e) => setBaseYear(parseInt(e.target.value))}
                            className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>

                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">app_registration</span> Sequenciais ({baseYear})
                            </h3>
                            <button type="button" onClick={addUnit} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-md">
                                <span className="material-symbols-outlined text-[18px]">add</span> ADICIONAR SEQUENCIAL
                            </button>
                        </div>

                        <div className="space-y-4">
                            {(units.length > 0 ? units.filter(u => u.year === baseYear) : [{ sequential: '', singleValue: 0, installmentValue: 0, installmentsCount: 1, year: baseYear, chosenMethod: 'Cota Única', status: IptuStatus.OPEN }]).map((unit, index) => (
                                <div key={index} className="p-6 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-end">
                                        <div className="sm:col-span-8 flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase">Sequencial</label>
                                            <input
                                                required
                                                value={unit.sequential}
                                                onChange={(e) => handleUnitChange(index, 'sequential', e.target.value)}
                                                className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-sm font-mono"
                                            />
                                        </div>
                                        <div className="sm:col-span-4 flex justify-end">
                                            {units.length > 1 && (
                                                <button type="button" onClick={() => removeUnit(index)} className="size-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100">
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            )}
                                        </div>
                                        <div className="sm:col-span-4 flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase underline decoration-emerald-500">Valor Cota Única</label>
                                            <input type="number" step="0.01" value={unit.singleValue} onChange={(e) => handleUnitChange(index, 'singleValue', Number(e.target.value))} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-bold text-emerald-600" />
                                        </div>
                                        <div className="sm:col-span-3 flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase underline decoration-orange-500">Valor Parcelado</label>
                                            <input type="number" step="0.01" value={unit.installmentValue} onChange={(e) => handleUnitChange(index, 'installmentValue', Number(e.target.value))} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-bold text-orange-600" />
                                        </div>
                                        <div className="sm:col-span-2 flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase leading-none">Parcelas</label>
                                            <input type="number" min="1" max="12" value={unit.installmentsCount} onChange={(e) => handleUnitChange(index, 'installmentsCount', Number(e.target.value))} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-bold text-[#111418] dark:text-white" />
                                        </div>
                                        <div className="sm:col-span-3 flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase">Forma</label>
                                            <select value={unit.chosenMethod} onChange={(e) => handleUnitChange(index, 'chosenMethod', e.target.value)} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-xs font-bold">
                                                <option value="Cota Única">Cota Única</option>
                                                <option value="Parcelado">Parcelado</option>
                                            </select>
                                        </div>
                                        <div className="sm:col-span-3 flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase">Status</label>
                                            <select value={unit.status} onChange={(e) => handleUnitChange(index, 'status', e.target.value)} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-xs font-bold">
                                                {Object.values(IptuStatus).map(status => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-6 pt-8 border-t border-gray-100 dark:border-[#2a3644]">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">group</span> Locatários ({baseYear})
                            </h3>
                            <button type="button" onClick={addTenant} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-md">
                                <span className="material-symbols-outlined text-[18px]">add</span> ADICIONAR LOCATÁRIO
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {tenants.filter(t => t.year === baseYear).map((tenant) => (
                                <div key={tenant.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="sm:col-span-7 flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Empresa</label>
                                        <input value={tenant.name} onChange={(e) => handleTenantChange(tenant.id, 'name', e.target.value)} className="h-10 px-4 rounded-lg border border-gray-200 bg-white dark:bg-[#1a2634] text-sm font-bold" />
                                    </div>
                                    <div className="sm:col-span-3 flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Área Ocupada (m²)</label>
                                        <input type="number" step="0.01" disabled={tenant.isSingleTenant} value={tenant.occupiedArea} onChange={(e) => handleTenantChange(tenant.id, 'occupiedArea', Number(e.target.value))} className="h-10 px-4 rounded-lg border border-gray-200 bg-white dark:bg-[#1a2634] text-sm font-bold disabled:opacity-50" />
                                    </div>
                                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Único Locatário</label>
                                        <div className="h-10 flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={tenant.isSingleTenant || false}
                                                onChange={(e) => {
                                                    // Se marcar um como único, desmarca os outros do mesmo ano
                                                    const updatedTenants = tenants.map(t => {
                                                        if (t.year === baseYear) {
                                                            return { ...t, isSingleTenant: t.id === tenant.id ? e.target.checked : false };
                                                        }
                                                        return t;
                                                    });
                                                    setTenants(updatedTenants);
                                                }}
                                                className="size-5 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                        </div>
                                    </div>
                                    <div className="sm:col-span-1 flex justify-end">
                                        <button type="button" onClick={() => removeTenant(tenant.id)} className="size-10 rounded-lg text-red-500 hover:bg-red-50">
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {tenantCalculations.length > 0 && (
                            <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-[#2a3644] bg-white dark:bg-[#1a2634] shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 dark:bg-[#1e2a3b] border-b-2 border-primary">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Empresa</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Percentual</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 text-right">{hasSingleTenant ? 'Valor' : 'Valor Rateio'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                        {tenantCalculations.map((calc) => (
                                            <tr key={calc.id} className="hover:bg-primary/5 transition-colors">
                                                <td className="px-6 py-4 text-xs font-bold uppercase">{calc.name || '---'}</td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{calc.percentage.toFixed(1)}%</span>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-black text-emerald-600 text-right">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calc.apportionment)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    <div className="flex justify-end gap-4 pt-8 border-t border-gray-100 dark:border-[#2a3644]">
                        <button type="button" onClick={onClose} className="px-8 h-12 text-[#617289] font-bold uppercase tracking-tight">Cancelar</button>
                        <button type="submit" className="px-10 h-12 bg-primary text-white rounded-xl text-sm font-bold hover:bg-[#a64614] shadow-lg shadow-primary/30 uppercase tracking-tight">Salvar Configurações</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default IptuConfigModal;
