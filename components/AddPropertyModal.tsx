
import React, { useState, useMemo } from 'react';
import { Property, PropertyType, IptuStatus, PropertyUnit, Tenant } from '../types';

interface AddPropertyModalProps {
  onClose: () => void;
  onSubmit: (property: Property, imageFile?: File) => void;
  onCancel: () => void;
  initialData?: Property;
}

const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ onClose, onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState<Partial<Property>>(initialData || {
    type: 'Apartamento',
    possession: 'Grupo',
    iptuHistory: [],
    landArea: 0,
    builtArea: 0,
    appraisalValue: 0,
    isComplex: false,
    units: [],
    tenants: [],
    registrationNumber: '',
    sequential: '',
    baseYear: new Date().getFullYear()
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [classSelected, setClassSelected] = useState<boolean>(!!initialData);

  const propertyTypes: PropertyType[] = ['Loja', 'Galpão', 'Terreno', 'Sala', 'Apartamento', 'Casa', 'Industrial', 'Prédio Comercial', 'Sala Comercial'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numValue = name === 'appraisalValue' || name === 'landArea' || name === 'builtArea' || name === 'baseYear'
      ? Number(value)
      : value;

    setFormData(prev => {
      const updated = { ...prev, [name]: numValue };

      // Se mudar o ano base, atualiza todos os units e tenants para manter consistência
      if (name === 'baseYear') {
        if (updated.units) {
          updated.units = updated.units.map(u => ({ ...u, year: numValue as number }));
        }
        if (updated.tenants) {
          updated.tenants = updated.tenants.map(t => ({ ...t, year: numValue as number }));
        }
      }
      return updated;
    });
  };

  const handleClassChange = (isComplex: boolean) => {
    const initialUnit: PropertyUnit = {
      sequential: formData.sequential || '',
      singleValue: 0,
      installmentValue: 0,
      installmentsCount: 1,
      year: formData.baseYear || new Date().getFullYear(),
      chosenMethod: 'Cota Única'
    };

    setFormData(prev => ({
      ...prev,
      isComplex,
      units: isComplex
        ? (prev.units?.length ? prev.units : [initialUnit])
        : []
    }));
    setClassSelected(true);
  };

  const handleUnitChange = (index: number, field: keyof PropertyUnit, value: any) => {
    const newUnits = [...(formData.units || [])];
    newUnits[index] = { ...newUnits[index], [field]: value } as PropertyUnit;

    // Sincronizar primeiro sequencial com os campos principais para compatibilidade legada se for Único
    if (!formData.isComplex && index === 0) {
      setFormData(prev => ({
        ...prev,
        units: newUnits,
        sequential: field === 'sequential' ? (value as string) : prev.sequential,
      }));
    } else {
      setFormData(prev => ({ ...prev, units: newUnits }));
    }
  };

  const addUnit = () => {
    setFormData(prev => ({
      ...prev,
      units: [{
        sequential: '',
        singleValue: 0,
        installmentValue: 0,
        installmentsCount: 1,
        year: formData.baseYear || new Date().getFullYear(),
        chosenMethod: 'Cota Única'
      }, ...(prev.units || [])]
    }));
  };

  const removeUnit = (index: number) => {
    if ((formData.units?.length || 0) <= 1) return;
    const newUnits = (formData.units || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, units: newUnits }));
  };

  const addTenant = () => {
    setFormData(prev => ({
      ...prev,
      tenants: [{
        id: crypto.randomUUID(),
        name: '',
        year: formData.baseYear || new Date().getFullYear(),
        occupiedArea: 0
      }, ...(prev.tenants || [])]
    }));
  };

  const removeTenant = (id: string) => {
    setFormData(prev => ({
      ...prev,
      tenants: (prev.tenants || []).filter(t => t.id !== id)
    }));
  };

  const handleTenantChange = (id: string, field: keyof Tenant, value: any) => {
    setFormData(prev => ({
      ...prev,
      tenants: (prev.tenants || []).map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const tenantCalculations = useMemo(() => {
    const allTenants = formData.tenants || [];
    const tenants = allTenants.filter(t => t.year === formData.baseYear);
    const unitsList = (formData.units || []).filter(u => u.year === formData.baseYear);
    const totalIptu = unitsList.reduce((acc, unit) => {
      const value = unit.chosenMethod === 'Parcelado' ? (Number(unit.installmentValue) || 0) : (Number(unit.singleValue) || 0);
      return acc + value;
    }, 0);
    const totalArea = tenants.reduce((acc, t) => acc + (Number(t.occupiedArea) || 0), 0);

    return tenants.map(t => {
      const percentage = totalArea > 0 ? (t.occupiedArea / totalArea) * 100 : 0;
      const apportionment = totalArea > 0 ? (t.occupiedArea / totalArea) * totalIptu : 0;
      return {
        ...t,
        percentage,
        apportionment
      };
    });
  }, [formData.tenants, formData.units, formData.baseYear]);

  const totalOccupiedArea = useMemo(() => {
    return (formData.tenants || []).reduce((acc, t) => acc + (Number(t.occupiedArea) || 0), 0);
  }, [formData.tenants]);

  const subtotals = useMemo(() => {
    const units = (formData.units || []).filter(u => u.year === formData.baseYear);
    const total = units.reduce((acc, unit) => {
      const value = unit.chosenMethod === 'Parcelado' ? (Number(unit.installmentValue) || 0) : (Number(unit.singleValue) || 0);
      return acc + value;
    }, 0);
    return { total };
  }, [formData.units, formData.baseYear]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalData = { ...formData };
    if (finalData.units?.length) {
      finalData.sequential = finalData.units[0].sequential;
    }

    const newProperty: Property = {
      ...finalData as Property,
      id: initialData?.id || crypto.randomUUID(),
      lastUpdated: new Date().toLocaleDateString('pt-BR'),
      imageUrl: previewUrl || formData.imageUrl || '/assets/default-property.png',
      iptuHistory: initialData?.iptuHistory || []
    };
    onSubmit(newProperty, selectedFile || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="bg-white dark:bg-[#1a2634] w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2a3644] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-[#2a3644]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">add_business</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#111418] dark:text-white">{initialData ? 'Editar Imóvel' : 'Adicionar Novo Imóvel'}</h2>
              <p className="text-xs text-[#617289] dark:text-[#9ca3af]">{initialData ? 'Atualize as informações do cadastro.' : 'Preencha as informações obrigatórias para o cadastro.'}</p>
            </div>
          </div>
          <button onClick={onCancel} className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3644]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Section: Identificação */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">info</span> Identificação
              </h3>

              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Nome do Imóvel</label>
                  <input required name="name" value={formData.name || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: Edifício Central" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Categoria do Imóvel</label>
                    <select name="type" value={formData.type} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-sm outline-none text-[#111418] dark:text-white">
                      {propertyTypes.map(t => <option key={t} value={t} className="bg-white dark:bg-[#1a2634] text-[#111418] dark:text-white">{t}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Posse</label>
                    <select name="possession" value={formData.possession} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-sm outline-none text-[#111418] dark:text-white">
                      <option value="Grupo" className="bg-white dark:bg-[#1a2634] text-[#111418] dark:text-white">Grupo</option>
                      <option value="Terceiros" className="bg-white dark:bg-[#1a2634] text-[#111418] dark:text-white">Terceiros</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Proprietário Atual</label>
                  <input required name="ownerName" value={formData.ownerName || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Nome completo" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Proprietário (Cadastro Imob.)</label>
                  <input required name="registryOwner" value={formData.registryOwner || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Razão social ou nome no registro" />
                </div>
              </div>
            </div>

            {/* Section: Localização */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">location_on</span> Endereço
              </h3>

              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Logradouro</label>
                  <input required name="address" value={formData.address || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none" placeholder="Rua, Número, Complemento" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Bairro</label>
                    <input required name="neighborhood" value={formData.neighborhood || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">CEP</label>
                    <input required name="zipCode" value={formData.zipCode || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none" placeholder="00000-000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Cidade</label>
                    <input required name="city" value={formData.city || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Estado (UF)</label>
                    <input required name="state" value={formData.state || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none" maxLength={2} placeholder="PE" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Tipo do Imóvel */}
            <div className="md:col-span-2 space-y-4 border-t border-gray-100 dark:border-[#2a3644] pt-8 bg-gray-50/30 dark:bg-gray-800/10 -mx-8 px-8 pb-6">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">category</span> Tipo do Imóvel
                </h3>
                <p className="text-[11px] text-[#617289] dark:text-[#9ca3af]">Selecione se o cadastro será para um registro único ou complexo (múltiplos sequenciais)</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <button
                  type="button"
                  onClick={() => handleClassChange(false)}
                  className={`flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all shadow-sm ${!formData.isComplex && classSelected ? 'border-primary bg-white dark:bg-[#1a2634] text-primary ring-4 ring-primary/10 scale-[1.02]' : 'border-gray-200 dark:border-[#2a3644] bg-white dark:bg-[#1a2634] text-gray-400 hover:border-gray-300 hover:scale-[1.01]'}`}
                >
                  <div className={`size-12 rounded-full flex items-center justify-center ${!formData.isComplex && classSelected ? 'bg-primary/10' : 'bg-gray-100 dark:bg-[#2a3644]'}`}>
                    <span className="material-symbols-outlined text-3xl">home</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-sm">Único</span>
                    <span className="text-[10px] opacity-70 font-medium">Um único sequencial</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleClassChange(true)}
                  className={`flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all shadow-sm ${formData.isComplex && classSelected ? 'border-primary bg-white dark:bg-[#1a2634] text-primary ring-4 ring-primary/10 scale-[1.02]' : 'border-gray-200 dark:border-[#2a3644] bg-white dark:bg-[#1a2634] text-gray-400 hover:border-gray-300 hover:scale-[1.01]'}`}
                >
                  <div className={`size-12 rounded-full flex items-center justify-center ${formData.isComplex && classSelected ? 'bg-primary/10' : 'bg-gray-100 dark:bg-[#2a3644]'}`}>
                    <span className="material-symbols-outlined text-3xl">domain</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-sm">Complexo</span>
                    <span className="text-[10px] opacity-70 font-medium">Dois ou mais sequenciais</span>
                  </div>
                </button>
              </div>

              {/* Ano de Referência Unificado */}
              {classSelected && (
                <div className="flex flex-col gap-1.5 mt-4">
                  <label className="text-xs font-bold text-primary uppercase tracking-wider">Ano de Referência</label>
                  <input
                    required
                    type="number"
                    name="baseYear"
                    value={formData.baseYear || ''}
                    onChange={handleInputChange}
                    className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-sm focus:ring-2 focus:ring-primary outline-none font-bold"
                    placeholder="2025"
                  />
                </div>
              )}
            </div>

            {/* Section: Registro de Sequencial (Conditional) */}
            {classSelected && (
              <div className="space-y-6 md:col-span-2 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">app_registration</span> Registro de Sequencial
                  </h3>
                  {formData.isComplex && (
                    <button
                      type="button"
                      onClick={addUnit}
                      className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      ADICIONAR SEQUENCIAL
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  {(formData.units?.length ? formData.units : [{
                    sequential: formData.sequential || '',
                    singleValue: 0,
                    installmentValue: 0,
                    installmentsCount: 1,
                    year: formData.baseYear || new Date().getFullYear(),
                    chosenMethod: 'Cota Única'
                  }]).map((unit, index) => (
                    <div key={index} className={`flex flex-col gap-6 p-6 rounded-2xl border ${index > 0 ? 'border-dashed border-gray-200 dark:border-gray-700' : 'border-transparent bg-gray-50/50 dark:bg-gray-800/30'}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-end">
                        {/* Linha 1: Identificação */}
                        <div className="sm:col-span-8 flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase">Sequencial {formData.isComplex ? `#${index + 1}` : ''}</label>
                          <input
                            required
                            id={`seq-input-${index}`}
                            value={unit.sequential}
                            onChange={(e) => handleUnitChange(index, 'sequential', e.target.value)}
                            className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-mono outline-none"
                            placeholder="0000"
                          />
                        </div>
                        <div className="sm:col-span-4 flex justify-end gap-2 pb-0.5">
                          {formData.isComplex && (
                            <>
                              <button
                                type="button"
                                onClick={() => document.getElementById(`seq-input-${index}`)?.focus()}
                                className="size-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-100 dark:border-gray-700"
                                title="Editar"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              {(formData.units?.length || 0) > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeUnit(index)}
                                  className="size-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all border border-red-100 dark:border-red-900/20"
                                  title="Excluir"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {/* Linha 2: Valores Financeiros */}
                        <div className="sm:col-span-4 flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase">Valor Cota Única (R$)</label>
                          <input
                            required
                            type="number"
                            step="0.01"
                            value={unit.singleValue}
                            onChange={(e) => handleUnitChange(index, 'singleValue', Number(e.target.value))}
                            className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold outline-none text-emerald-600"
                          />
                        </div>
                        <div className="sm:col-span-4 flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase">Valor Total Parcelado (R$)</label>
                          <input
                            required
                            type="number"
                            step="0.01"
                            value={unit.installmentValue}
                            onChange={(e) => handleUnitChange(index, 'installmentValue', Number(e.target.value))}
                            className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold outline-none text-orange-600"
                          />
                        </div>
                        <div className="sm:col-span-4 flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase">Quantidade de Parcelas</label>
                          <input
                            required
                            type="number"
                            min="1"
                            max="12"
                            value={unit.installmentsCount}
                            onChange={(e) => handleUnitChange(index, 'installmentsCount', Number(e.target.value))}
                            className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none text-[#111418] dark:text-white"
                          />
                        </div>

                        {/* Linha 3: Forma de Pagamento */}
                        <div className="sm:col-span-12 flex flex-col gap-1.5 pt-2">
                          <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase">Forma de Pagamento Escolhida</label>
                          <div className="flex flex-wrap gap-2">
                            {['Cota Única', 'Parcelado', 'Em aberto'].map((method) => (
                              <button
                                key={method}
                                type="button"
                                onClick={() => handleUnitChange(index, 'chosenMethod', method)}
                                className={`px-4 h-10 rounded-lg text-xs font-bold border-2 transition-all ${unit.chosenMethod === method
                                  ? 'bg-primary border-primary text-white shadow-sm'
                                  : 'bg-white dark:bg-[#1a2634] border-gray-200 dark:border-gray-700 text-gray-400 hover:border-primary/50'
                                  }`}
                              >
                                {method}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Subtotal Section */}
                  <div className="bg-primary/5 dark:bg-primary/10 p-6 rounded-2xl border-2 border-primary/20 space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <div className="flex items-center gap-2 text-primary">
                      <span className="material-symbols-outlined text-[20px]">calculate</span>
                      <h4 className="text-xs font-black uppercase tracking-widest">Resumo Subtotal ({formData.baseYear || ''})</h4>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[#111418] dark:text-primary uppercase tracking-tighter">Subtotal Geral (Baseado na escolha de cada sequencial)</span>
                      <span className="text-3xl font-black text-primary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotals.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section: Registro de Locatário */}
            {classSelected && (
              <div className="space-y-6 md:col-span-2 border-t border-gray-100 dark:border-[#2a3644] pt-8 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">group</span> Registro de Locatários ({formData.baseYear || ''})
                    </h3>
                    <p className="text-[11px] text-[#617289] dark:text-[#9ca3af]">Cadastre as empresas e suas respectivas áreas para o rateio do IPTU</p>
                  </div>
                  <button
                    type="button"
                    onClick={addTenant}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-[#a64614] transition-all shadow-md active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    ADICIONAR LOCATÁRIO
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {(formData.tenants || []).map((tenant) => (
                    <div key={tenant.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="sm:col-span-7 flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Nome da Empresa</label>
                        <input
                          required
                          value={tenant.name}
                          onChange={(e) => handleTenantChange(tenant.id, 'name', e.target.value)}
                          className="h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-sm focus:ring-2 focus:ring-primary outline-none"
                          placeholder="Digite o nome da empresa"
                        />
                      </div>
                      <div className="sm:col-span-3 flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Área Ocupada (m²)</label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          value={tenant.occupiedArea}
                          onChange={(e) => handleTenantChange(tenant.id, 'occupiedArea', Number(e.target.value))}
                          className="h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-sm focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2 flex justify-end pb-0.5">
                        <button
                          type="button"
                          onClick={() => removeTenant(tenant.id)}
                          className="size-10 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all border border-red-100 dark:border-red-900/20"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Apportionment Summary Table */}
                {(formData.tenants?.length || 0) > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-[#2a3644] bg-white dark:bg-[#1a2634] shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 dark:bg-[#1e2a3b] border-b-2 border-primary">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 dark:text-[#9ca3af]">Empresa</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 dark:text-[#9ca3af]">Área</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 dark:text-[#9ca3af]">Percentual</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 dark:text-[#9ca3af] text-right">Valor Rateio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {tenantCalculations.map((calc) => (
                          <tr key={calc.id} className="hover:bg-primary/5 transition-colors">
                            <td className="px-6 py-4 text-xs font-bold text-[#111418] dark:text-white uppercase truncate max-w-[200px]">{calc.name || '---'}</td>
                            <td className="px-6 py-4 text-xs font-semibold text-[#617289] dark:text-[#9ca3af]">{calc.occupiedArea.toLocaleString('pt-BR')} m²</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all duration-500"
                                    style={{ width: `${calc.percentage}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-black text-primary">{calc.percentage.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-black text-emerald-600 text-right">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calc.apportionment)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50/50 dark:bg-[#1e2a3b]/50 border-t-2 border-gray-100 dark:border-[#2a3644]">
                        <tr>
                          <td className="px-6 py-3 text-[10px] font-black uppercase text-primary">Total</td>
                          <td className="px-6 py-3 text-xs font-black text-[#111418] dark:text-white">{totalOccupiedArea.toLocaleString('pt-BR')} m²</td>
                          <td className="px-6 py-3 text-[10px] font-black text-primary">100%</td>
                          <td className="px-6 py-3 text-xs font-black text-emerald-600 text-right">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotals.total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Section: Foto do Imóvel */}
            <div className="space-y-6 md:col-span-2 border-t border-gray-100 dark:border-[#2a3644] pt-8">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add_a_photo</span> Foto do Imóvel
              </h3>

              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-full sm:w-48 h-48 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900/30">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Current" className="w-full h-full object-cover" />
                  ) : (
                    <img src="/assets/default-property.png" alt="Padrão" className="w-full h-full object-cover opacity-50" />
                  ))}
                </div>

                <div className="flex-1 space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Selecione uma foto nítida da fachada ou ambiente principal do imóvel. <br />
                    Formatos suportados: JPG, PNG. Tamanho máx: 5MB.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    id="property-photo"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="property-photo"
                    className="inline-flex items-center gap-2 px-6 h-11 bg-white dark:bg-[#2a3644] border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 cursor-pointer transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    SELECIONAR FOTO
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-end gap-4 border-t border-gray-100 dark:border-[#2a3644] pt-8">
            <button type="button" onClick={onCancel} className="px-8 h-12 bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700 text-[#111418] dark:text-white rounded-xl text-sm font-bold hover:bg-gray-50 transition-all">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!classSelected}
              className={`px-10 h-12 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 ${classSelected ? 'bg-primary text-white hover:bg-[#a64614] shadow-primary/20' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'}`}
            >
              {initialData ? 'Atualizar Imóvel' : 'Salvar Imóvel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPropertyModal;

