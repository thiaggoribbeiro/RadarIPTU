
import React, { useState, useMemo } from 'react';
import { Property, PropertyUnit, Tenant, PaymentMethod, IptuStatus } from '../types';

interface IptuConfigModalProps {
    property: Property;
    initialSection?: 'units' | 'tenants' | 'newCharge';
    initialYear?: number;
    initialSequential?: string;
    onClose: () => void;
    onSubmit: (propertyId: string, units: PropertyUnit[], tenants: Tenant[], baseYear: number) => void;
}

const IptuConfigModal: React.FC<IptuConfigModalProps> = ({ property, initialSection, initialYear, initialSequential, onClose, onSubmit }) => {
    const [baseYear, setBaseYear] = useState<number>(initialYear || property.baseYear || new Date().getFullYear());
    // When editing a single sequential, only show that one; otherwise show all
    const [editingSingleUnit] = useState<string | undefined>(initialSequential);
    const [units, setUnits] = useState<(PropertyUnit & { tempId?: string })[]>(
        (property.units || []).map(u => ({ ...u, tempId: crypto.randomUUID() }))
    );
    const [tenants, setTenants] = useState<Tenant[]>(property.tenants || []);
    const [isManualApportionment, setIsManualApportionment] = useState<boolean>(
        tenants.some(t => t.year === baseYear && t.manualPercentage !== undefined)
    );
    const [isNewChargeModalOpen, setIsNewChargeModalOpen] = useState(initialSection === 'newCharge');
    const [newChargeYear, setNewChargeYear] = useState<number>(new Date().getFullYear());

    const handleUnitChange = (unitToUpdate: (PropertyUnit & { tempId?: string }), field: keyof PropertyUnit, value: any) => {
        setUnits(prev => prev.map(u => u.tempId === unitToUpdate.tempId ? { ...u, [field]: value } : u));
    };

    const addUnit = () => {
        const newUnit: PropertyUnit & { tempId?: string } = {
            tempId: crypto.randomUUID(),
            sequential: '',
            registrationNumber: '',
            address: '',
            ownerName: '',
            registryOwner: '',
            landArea: 0,
            builtArea: 0,
            singleValue: 0,
            installmentValue: 0,
            installmentsCount: 1,
            year: baseYear,
            chosenMethod: 'Cota Única',
            status: IptuStatus.OPEN
        };
        setUnits([newUnit, ...units]);
    };

    const removeUnit = (unitToRemove: (PropertyUnit & { tempId?: string })) => {
        setUnits(units.filter(u => u.tempId !== unitToRemove.tempId));
    };

    const addTenant = () => {
        setTenants([{
            id: crypto.randomUUID(),
            name: '',
            year: baseYear,
            occupiedArea: 0,
            selectedSequential: '',
            isSingleTenant: false
        }, ...tenants]);
    };

    const removeTenant = (id: string) => {
        setTenants(tenants.filter(t => t.id !== id));
    };

    const handleTenantChange = (tenantToUpdate: Tenant, field: keyof Tenant, value: any) => {
        let updatedValue = value;
        let additionalUpdates = {};

        if (field === 'selectedSequential' && value) {
            const selectedUnit = units.find(u => u.sequential === value && u.year === baseYear);
            if (selectedUnit) {
                // Usamos landArea como área padrão do sequencial para o rateio
                additionalUpdates = { occupiedArea: selectedUnit.landArea || selectedUnit.builtArea || 0 };
            }
        }

        setTenants(prev => prev.map(t => t.id === tenantToUpdate.id ? { ...t, [field]: updatedValue, ...additionalUpdates } : t));
    };

    const startNewCharge = (year: number) => {
        const uniqueSequentialsMap = new Map<string, PropertyUnit>();
        // Pegar a versão mais recente de cada sequencial
        const sortedUnits = [...units].sort((a, b) => b.year - a.year);

        sortedUnits.forEach(u => {
            if (!uniqueSequentialsMap.has(u.sequential)) {
                uniqueSequentialsMap.set(u.sequential, u);
            }
        });

        const newUnits: (PropertyUnit & { tempId?: string })[] = [];
        uniqueSequentialsMap.forEach((u, seq) => {
            const exists = units.some(unit => unit.sequential === seq && unit.year === year);
            if (!exists) {
                newUnits.push({
                    tempId: crypto.randomUUID(),
                    sequential: u.sequential,
                    registrationNumber: u.registrationNumber,
                    address: u.address,
                    ownerName: u.ownerName,
                    registryOwner: u.registryOwner,
                    landArea: u.landArea,
                    builtArea: u.builtArea,
                    singleValue: 0,
                    installmentValue: 0,
                    installmentsCount: u.installmentsCount || 10,
                    year: year,
                    chosenMethod: 'Cota Única',
                    status: IptuStatus.OPEN
                });
            }
        });

        if (newUnits.length > 0) {
            setUnits([...newUnits, ...units]);
        }

        setBaseYear(year);
        setIsNewChargeModalOpen(false);
    };

    const subtotals = useMemo(() => {
        const yearUnits = units.filter(u => u.year === baseYear);
        return {
            single: yearUnits.reduce((acc, curr) => acc + curr.singleValue, 0),
            installment: yearUnits.reduce((acc, curr) => acc + curr.installmentValue, 0)
        };
    }, [units, baseYear]);

    const tenantCalculations = useMemo(() => {
        const yearTenants = tenants.filter(t => t.year === baseYear);
        const singleTenant = yearTenants.find(t => t.isSingleTenant);

        const totalIptuValue = units
            .filter(u => u.year === baseYear)
            .reduce((acc, unit) => {
                return acc + (unit.chosenMethod === 'Parcelado' ? (Number(unit.installmentValue) || 0) : (Number(unit.singleValue) || 0));
            }, 0);

        if (singleTenant) {
            return yearTenants.map(t => ({
                ...t,
                percentage: t.id === singleTenant.id ? 100 : 0,
                apportionment: t.id === singleTenant.id ? totalIptuValue : 0
            }));
        }

        const totalArea = yearTenants.reduce((acc, t) => acc + (Number(t.occupiedArea) || 0), 0);
        return yearTenants.map(t => {
            let percentage = 0;
            if (isManualApportionment) {
                percentage = Number(t.manualPercentage) || 0;
            } else {
                percentage = totalArea > 0 ? (t.occupiedArea / totalArea) * 100 : 0;
            }
            const apportionment = (percentage / 100) * totalIptuValue;
            return { ...t, percentage, apportionment };
        });
    }, [tenants, baseYear, units, isManualApportionment]);

    const hasSingleTenant = useMemo(() => {
        return tenants.some(t => t.year === baseYear && t.isSingleTenant);
    }, [tenants, baseYear]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        // Remover tempId antes de salvar
        const cleanedUnits = units.map(({ tempId, ...u }) => u);
        onSubmit(property.id, cleanedUnits, tenants, baseYear);
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
                            <h2 className="text-xl font-semibold text-[#111418] dark:text-white uppercase tracking-tight">
                                {initialSection === 'units' ? 'Cadastro de Sequencial' : 'Configuração de IPTU'}
                            </h2>
                            <p className="text-xs text-[#617289] dark:text-[#9ca3af] font-medium">{property.name} - {initialSection === 'units' ? 'Registro de Unidades' : 'Gestão de Sequenciais e Locatários'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3644]">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>

                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                    {/* Seção de Ano: Visível se não houver seção específica (Novo IPTU ou Locatários) */}
                    {(!initialSection || initialSection === 'newCharge' || initialSection === 'tenants') && (
                        <div className="flex flex-col gap-1.5 p-4 bg-primary/5 rounded-xl border border-primary/20">
                            <label className="text-xs font-bold text-primary uppercase tracking-wider">Ano de Referência das Configurações</label>
                            <input
                                required
                                type="number"
                                value={baseYear}
                                onChange={(e) => setBaseYear(parseInt(e.target.value))}
                                className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-sm font-semibold focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    )}

                    {/* Seção de Sequenciais */}
                    {(!initialSection || initialSection === 'units' || initialSection === 'newCharge') && (
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">app_registration</span> Sequenciais {initialSection !== 'units' ? `(${baseYear})` : ''}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={addUnit} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold shadow-md hover:bg-[#a64614] transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">add</span> NOVO SEQUENCIAL
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {(() => {
                                    let yearUnits = units.filter(u => u.year === baseYear);
                                    // If editing a single sequential, filter to only that one
                                    if (editingSingleUnit) {
                                        yearUnits = yearUnits.filter(u => u.sequential === editingSingleUnit);
                                    }
                                    if (yearUnits.length === 0) {
                                        return (
                                            <div className="p-8 text-center bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                                                <p className="text-xs text-[#617289] font-semibold uppercase italic">Nenhum sequencial configurado para {baseYear}</p>
                                            </div>
                                        );
                                    }
                                    return yearUnits.map((unit) => (
                                        <div key={unit.tempId} className="p-6 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-end">
                                                <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-xs font-semibold text-[#111418] dark:text-slate-300 uppercase">Sequencial</label>
                                                        <input
                                                            required
                                                            value={unit.sequential}
                                                            onChange={(e) => handleUnitChange(unit, 'sequential', e.target.value)}
                                                            className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-sm font-mono"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-xs font-semibold text-[#111418] dark:text-slate-300 uppercase">Inscrição</label>
                                                        <input
                                                            value={unit.registrationNumber || ''}
                                                            onChange={(e) => handleUnitChange(unit, 'registrationNumber', e.target.value)}
                                                            className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-sm font-mono"
                                                            placeholder="Opcional"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5 sm:col-span-12">
                                                        <label className="text-xs font-semibold text-[#111418] dark:text-slate-300 uppercase">Endereço do Sequencial</label>
                                                        <input
                                                            value={unit.address || ''}
                                                            onChange={(e) => handleUnitChange(unit, 'address', e.target.value)}
                                                            placeholder="Ex: Sala 101, Bloco A"
                                                            className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-sm"
                                                        />
                                                    </div>

                                                    <div className="flex flex-col gap-1.5 sm:col-span-6">
                                                        <label className="text-xs font-semibold text-[#111418] dark:text-slate-300 uppercase underline decoration-emerald-500">Área Total (m²)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={unit.landArea || 0}
                                                            onChange={(e) => handleUnitChange(unit, 'landArea', Number(e.target.value))}
                                                            className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-sm font-semibold"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5 sm:col-span-6">
                                                        <label className="text-xs font-semibold text-[#111418] dark:text-slate-300 uppercase underline decoration-blue-500">Área Construída (m²)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={unit.builtArea || 0}
                                                            onChange={(e) => handleUnitChange(unit, 'builtArea', Number(e.target.value))}
                                                            className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-sm font-semibold"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="sm:col-span-4 flex justify-end">
                                                    <button type="button" onClick={() => removeUnit(unit)} className="size-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100">
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                </div>

                                                {/* Campos Financeiros: Visíveis se não for apenas cadastro ou se estiver editando um sequencial específico */}
                                                {(initialSection !== 'units' || initialSequential) && (
                                                    <>
                                                        <div className="sm:col-span-4 flex flex-col gap-1.5">
                                                            <label className="text-xs font-semibold text-[#111418] dark:text-slate-300 uppercase underline decoration-emerald-500">Valor Cota Única</label>
                                                            <input type="number" step="0.01" value={unit.singleValue} onChange={(e) => handleUnitChange(unit, 'singleValue', Number(e.target.value))} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold text-emerald-600" />
                                                        </div>
                                                        <div className="sm:col-span-3 flex flex-col gap-1.5">
                                                            <label className="text-xs font-semibold text-[#111418] dark:text-slate-300 uppercase underline decoration-orange-500">Valor Parcelado</label>
                                                            <input type="number" step="0.01" value={unit.installmentValue} onChange={(e) => handleUnitChange(unit, 'installmentValue', Number(e.target.value))} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold text-orange-600" />
                                                        </div>
                                                        <div className="sm:col-span-2 flex flex-col gap-1.5">
                                                            <label className="text-xs font-semibold text-[#111418] dark:text-slate-300 uppercase leading-none">Parcelas</label>
                                                            <input type="number" min="1" max="12" value={unit.installmentsCount} onChange={(e) => handleUnitChange(unit, 'installmentsCount', Number(e.target.value))} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold text-[#111418] dark:text-white" />
                                                        </div>
                                                        <div className="sm:col-span-3 flex flex-col gap-1.5">
                                                            <label className="text-xs font-semibold text-[#111418] dark:text-slate-300 uppercase">Forma</label>
                                                            <select value={unit.chosenMethod} onChange={(e) => handleUnitChange(unit, 'chosenMethod', e.target.value as PaymentMethod)} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-xs font-semibold">
                                                                <option value="Cota Única">Cota Única</option>
                                                                <option value="Parcelado">Parcelado</option>
                                                            </select>
                                                        </div>
                                                        <div className="sm:col-span-3 flex flex-col gap-1.5">
                                                            <label className="text-xs font-semibold text-[#111418] dark:text-slate-300 uppercase">Status</label>
                                                            <select value={unit.status} onChange={(e) => handleUnitChange(unit, 'status', e.target.value as IptuStatus)} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-xs font-semibold">
                                                                {Object.values(IptuStatus).map(status => (
                                                                    <option key={status} value={status}>{status}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </section>
                    )}

                    {/* Seção de Locatários */}
                    {(!initialSection || initialSection === 'tenants' || initialSection === 'newCharge') && (
                        <section className="space-y-6 pt-8 border-t border-gray-100 dark:border-[#2a3644]">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">group</span> Locatários ({baseYear})
                                </h3>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={isManualApportionment}
                                                onChange={(e) => setIsManualApportionment(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-primary uppercase tracking-widest transition-colors">Rateio Manual</span>
                                    </label>
                                    <button type="button" onClick={addTenant} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold shadow-md">
                                        <span className="material-symbols-outlined text-[18px]">add</span> ADICIONAR LOCATÁRIO
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {tenants.filter(t => t.year === baseYear).map((tenant) => (
                                    <div key={tenant.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <div className={`${isManualApportionment ? 'sm:col-span-7' : 'sm:col-span-5'} flex flex-col gap-1.5`}>
                                            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-tighter">Empresa</label>
                                            <input value={tenant.name} onChange={(e) => handleTenantChange(tenant, 'name', e.target.value)} className="h-10 px-4 rounded-lg border border-gray-200 bg-white dark:bg-[#1a2634] text-sm font-semibold" />
                                        </div>
                                        {!isManualApportionment && (
                                            <div className="sm:col-span-2 flex flex-col gap-1.5">
                                                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-tighter">Área (m²)</label>
                                                <div className="h-10 flex items-center px-4 rounded-lg text-sm font-bold transition-colors bg-gray-100 dark:bg-gray-800 text-primary">
                                                    {tenant.occupiedArea.toLocaleString('pt-BR')} m²
                                                </div>
                                            </div>
                                        )}
                                        <div className="sm:col-span-2 flex flex-col gap-1.5">
                                            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-tighter">Único Locatário</label>
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
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-500">Empresa</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-500">Percentual</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-500 text-right">{hasSingleTenant ? 'Valor' : 'Valor Rateio'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                            {tenantCalculations.map((calc) => (
                                                <tr key={calc.id} className="hover:bg-primary/5 transition-colors">
                                                    <td className="px-6 py-4 text-xs font-semibold uppercase">{calc.name || '---'}</td>
                                                    <td className="px-6 py-4">
                                                        {isManualApportionment ? (
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    min="0"
                                                                    max="100"
                                                                    value={calc.manualPercentage || 0}
                                                                    onChange={(e) => handleTenantChange(calc as Tenant, 'manualPercentage', Number(e.target.value))}
                                                                    className="w-16 h-8 px-2 rounded-lg border border-primary/30 bg-primary/5 text-[10px] font-black text-primary outline-none focus:ring-2 focus:ring-primary/20"
                                                                />
                                                                <span className="text-[10px] font-black text-primary">%</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{calc.percentage.toFixed(1)}%</span>
                                                        )}
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
                    )}

                    <div className="flex justify-end gap-4 pt-8 border-t border-gray-100 dark:border-[#2a3644]">
                        <button type="button" onClick={onClose} className="px-8 h-12 text-[#617289] font-bold uppercase tracking-tight">Cancelar</button>
                        <button type="submit" className="px-10 h-12 bg-primary text-white rounded-xl text-sm font-bold hover:bg-[#a64614] shadow-lg shadow-primary/30 uppercase tracking-tight">Salvar Configurações</button>
                    </div>
                </form>
            </div>

            {/* Modal de Nova Cobrança */}
            {
                isNewChargeModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-[#1a2634] w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-gray-100 dark:border-[#2a3644]">
                            <h3 className="text-lg font-bold text-[#111418] dark:text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-600">history_edu</span> Nova Cobrança
                            </h3>
                            <p className="text-sm text-[#617289] dark:text-[#9ca3af] mb-6">
                                Ao iniciar uma nova cobrança, todos os sequenciais existentes serão carregados para o novo ano selecionado com valores zerados.
                            </p>
                            <div className="space-y-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selecione o Ano</label>
                                    <input
                                        type="number"
                                        value={newChargeYear}
                                        onChange={(e) => setNewChargeYear(parseInt(e.target.value))}
                                        className="h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#22303e] text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsNewChargeModalOpen(false)}
                                        className="flex-1 h-11 rounded-xl text-xs font-bold uppercase tracking-tight text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => startNewCharge(newChargeYear)}
                                        className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-xs font-bold uppercase tracking-tight hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all"
                                    >
                                        Iniciar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default IptuConfigModal;
