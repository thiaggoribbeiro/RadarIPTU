
import React, { useState } from 'react';
import { Property, PropertyType, IptuStatus, PropertyUnit } from '../types';

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
    registrationNumber: '',
    sequential: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [classSelected, setClassSelected] = useState<boolean>(!!initialData);

  const propertyTypes: PropertyType[] = ['Loja', 'Galpão', 'Terreno', 'Sala', 'Apartamento', 'Casa', 'Industrial', 'Prédio Comercial', 'Sala Comercial'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'appraisalValue' || name === 'landArea' || name === 'builtArea'
        ? Number(value)
        : value
    }));
  };

  const handleClassChange = (isComplex: boolean) => {
    setFormData(prev => ({
      ...prev,
      isComplex,
      units: isComplex ? (prev.units?.length ? prev.units : [{ registrationNumber: prev.registrationNumber || '', sequential: prev.sequential || '' }]) : []
    }));
    setClassSelected(true);
  };

  const handleUnitChange = (index: number, field: keyof PropertyUnit, value: string) => {
    const newUnits = [...(formData.units || [])];
    newUnits[index] = { ...newUnits[index], [field]: value };

    // Sincronizar primeiro sequencial com os campos principais para compatibilidade legada se for Único
    if (!formData.isComplex && index === 0) {
      setFormData(prev => ({
        ...prev,
        units: newUnits,
        registrationNumber: field === 'registrationNumber' ? value : prev.registrationNumber,
        sequential: field === 'sequential' ? value : prev.sequential
      }));
    } else {
      setFormData(prev => ({ ...prev, units: newUnits }));
    }
  };

  const addUnit = () => {
    setFormData(prev => ({
      ...prev,
      units: [...(prev.units || []), { registrationNumber: '', sequential: '' }]
    }));
  };

  const removeUnit = (index: number) => {
    if ((formData.units?.length || 0) <= 1) return;
    const newUnits = (formData.units || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, units: newUnits }));
  };

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

    // Assegurar que registrationNumber e sequential reflitam a primeira unidade se for Único
    const finalData = { ...formData };
    if (!finalData.isComplex && finalData.units?.length) {
      finalData.registrationNumber = finalData.units[0].registrationNumber;
      finalData.sequential = finalData.units[0].sequential;
    } else if (finalData.isComplex && finalData.units?.length) {
      finalData.registrationNumber = finalData.units[0].registrationNumber;
      finalData.sequential = finalData.units[0].sequential;
    }

    const newProperty: Property = {
      ...finalData as Property,
      id: initialData?.id || crypto.randomUUID(),
      lastUpdated: new Date().toLocaleDateString('pt-BR'),
      imageUrl: previewUrl || formData.imageUrl || `https://picsum.photos/seed/${Math.random()}/400/400`,
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
                  <input required name="name" value={formData.name || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:ring-2 focus:ring-primary outline-none text-[#111418] dark:text-white" placeholder="Ex: Edifício Central" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Categoria do Imóvel</label>
                    <select name="type" value={formData.type} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none text-[#111418] dark:text-white">
                      {propertyTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Posse</label>
                    <select name="possession" value={formData.possession} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none text-[#111418] dark:text-white">
                      <option value="Grupo">Grupo</option>
                      <option value="Terceiros">Terceiros</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Proprietário Atual</label>
                  <input required name="ownerName" value={formData.ownerName || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:ring-2 focus:ring-primary outline-none text-[#111418] dark:text-white" placeholder="Nome completo" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Proprietário (Cadastro Imob.)</label>
                  <input required name="registryOwner" value={formData.registryOwner || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:ring-2 focus:ring-primary outline-none text-[#111418] dark:text-white" placeholder="Razão social ou nome no registro" />
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
                  <input required name="address" value={formData.address || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none text-[#111418] dark:text-white" placeholder="Rua, Número, Complemento" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Bairro</label>
                    <input required name="neighborhood" value={formData.neighborhood || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none text-[#111418] dark:text-white" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">CEP</label>
                    <input required name="zipCode" value={formData.zipCode || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none text-[#111418] dark:text-white" placeholder="00000-000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Cidade</label>
                    <input required name="city" value={formData.city || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none text-[#111418] dark:text-white" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Estado (UF)</label>
                    <input required name="state" value={formData.state || ''} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none text-[#111418] dark:text-white" maxLength={2} placeholder="PE" />
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
            </div>

            {/* Section: Registro do Imóvel (Conditional) */}
            {classSelected && (
              <div className="space-y-6 md:col-span-2 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">app_registration</span> Registro do Imóvel
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

                <div className="space-y-4">
                  {(formData.units?.length ? formData.units : [{ registrationNumber: '', sequential: '' }]).map((unit, index) => (
                    <div key={index} className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border ${index > 0 ? 'border-dashed border-gray-200 dark:border-gray-700' : 'border-transparent bg-gray-50/50 dark:bg-gray-800/30'}`}>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Nº Inscrição {formData.isComplex ? `#${index + 1}` : ''}</label>
                        <input
                          required
                          value={unit.registrationNumber}
                          onChange={(e) => handleUnitChange(index, 'registrationNumber', e.target.value)}
                          className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-mono outline-none text-[#111418] dark:text-white"
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 relative">
                        <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Sequencial {formData.isComplex ? `#${index + 1}` : ''}</label>
                        <div className="flex gap-2">
                          <input
                            required
                            value={unit.sequential}
                            onChange={(e) => handleUnitChange(index, 'sequential', e.target.value)}
                            className="flex-1 h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-mono outline-none text-[#111418] dark:text-white"
                            placeholder="0000"
                          />
                          {formData.isComplex && index > 0 && (
                            <button
                              type="button"
                              onClick={() => removeUnit(index)}
                              className="size-11 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                            >
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Área Terreno (m²)</label>
                      <input required type="number" name="landArea" value={formData.landArea || 0} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none text-[#111418] dark:text-white" placeholder="0" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#111418] dark:text-slate-300">Área Construída (m²)</label>
                      <input required type="number" name="builtArea" value={formData.builtArea || 0} onChange={handleInputChange} className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none text-[#111418] dark:text-white" placeholder="0" />
                    </div>
                  </div>
                </div>
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
                    <span className="material-symbols-outlined text-gray-400 text-4xl">image</span>
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

