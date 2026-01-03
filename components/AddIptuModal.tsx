
import React, { useState, useEffect, useMemo } from 'react';
import { Property, IptuRecord, PaymentMethod, IptuStatus } from '../types';

interface AddIptuModalProps {
  property: Property;
  initialData?: IptuRecord;
  onClose: () => void;
  onSubmit: (newIptu: IptuRecord) => void;
}

const HOLMES_COMPANIES = [
  'Holmes Asset Management',
  'Gestão Global Imobiliária',
  'Horizonte Administração',
  'Lançamentos Prime LTDA',
  'Patrimônio Ativo'
];

const AddIptuModal: React.FC<AddIptuModalProps> = ({ property, initialData, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    year: initialData?.year || new Date().getFullYear(),
    singleValue: initialData?.singleValue || 0,
    installmentValue: initialData?.installmentValue || 0,
    installmentsCount: initialData?.installmentsCount || 1,
    chosenMethod: (initialData?.chosenMethod || 'Cota Única') as PaymentMethod,
    holmesCompany: initialData?.holmesCompany || HOLMES_COMPANIES[0],
    startDate: initialData?.startDate || new Date().toISOString().split('T')[0],
    selectedSequentials: initialData?.selectedSequentials || (property.isComplex ? [] : [property.sequential])
  });

  const diffSingleVsParcel = useMemo(() => {
    return Math.abs(formData.installmentValue - formData.singleValue);
  }, [formData.singleValue, formData.installmentValue]);

  const usedSequentialsForYear = useMemo(() => {
    return property.iptuHistory
      .filter(h => h.year === formData.year && h.id !== initialData?.id)
      .flatMap(h => h.selectedSequentials || []);
  }, [property.iptuHistory, formData.year, initialData]);

  const lastYearIptu = useMemo(() => {
    return property.iptuHistory.find(h => h.year === formData.year - 1);
  }, [property.iptuHistory, formData.year]);

  const diffVsLastYear = useMemo(() => {
    if (!lastYearIptu) return 0;
    const currentBase = formData.chosenMethod === 'Cota Única' ? formData.singleValue : formData.installmentValue;
    const lastBase = lastYearIptu.value;
    return currentBase - lastBase;
  }, [lastYearIptu, formData.singleValue, formData.installmentValue, formData.chosenMethod]);

  const toggleSequential = (seq: string) => {
    if (usedSequentialsForYear.includes(seq)) return;
    setFormData(prev => {
      const current = prev.selectedSequentials;
      if (current.includes(seq)) {
        return { ...prev, selectedSequentials: current.filter(s => s !== seq) };
      } else {
        return { ...prev, selectedSequentials: [...current, seq] };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalValue = formData.chosenMethod === 'Cota Única' ? formData.singleValue : formData.installmentValue;

    const newIptu: IptuRecord = {
      ...formData,
      id: initialData?.id || crypto.randomUUID(),
      status: initialData?.status || IptuStatus.PENDING,
      value: finalValue,
    };

    onSubmit(newIptu);
  };

  const availableSequentials = useMemo(() => {
    if (property.isComplex) {
      return property.units.map(u => u.sequential);
    }
    return [property.sequential];
  }, [property]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#1a2634] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2a3644] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-8 py-6 border-b-4 border-primary bg-gray-50 dark:bg-[#1e2a3b]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
              <span className="material-symbols-outlined font-semibold">{initialData ? 'edit_document' : 'receipt_long'}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#111418] dark:text-white uppercase tracking-tight">{initialData ? 'Editar IPTU' : 'Lançar Novo IPTU'}</h2>
              <p className="text-xs font-semibold text-[#617289] dark:text-[#9ca3af]">
                {initialData ? `Alterando dados do IPTU ${initialData.year}` : 'Registre valores e formas de pagamento.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="size-10 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined text-[20px] font-semibold">close</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase tracking-tighter">Ano de Referência</label>
              <input
                type="number"
                required
                disabled={!!initialData}
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className={`h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold focus:ring-2 focus:ring-primary outline-none ${initialData ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase tracking-tighter">Empresa Lançada (Holmes)</label>
              <input
                type="text"
                required
                placeholder="Ex: Holmes Asset Management"
                value={formData.holmesCompany}
                onChange={e => setFormData({ ...formData, holmesCompany: e.target.value })}
                className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Nova Seção: Seleção de Sequenciais */}
            <div className="md:col-span-2 space-y-3 bg-gray-50 dark:bg-[#1e2a3b] p-4 rounded-xl border border-gray-100 dark:border-[#2a3644]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase tracking-tighter flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">list_alt</span>
                  Sequenciais Atrelados à Empresa
                </label>
                <div className="flex items-center gap-2">
                  {usedSequentialsForYear.length > 0 && (
                    <span className="text-[9px] font-bold text-orange-500 uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">warning</span>
                      Alguns sequenciais já têm IPTU em {formData.year}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {formData.selectedSequentials.length} selecionado(s)
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableSequentials.map(seq => {
                  const isUsed = usedSequentialsForYear.includes(seq);
                  const isSelected = formData.selectedSequentials.includes(seq);
                  return (
                    <button
                      key={seq}
                      type="button"
                      disabled={isUsed}
                      onClick={() => toggleSequential(seq)}
                      title={isUsed ? "Este sequencial já foi utilizado em outro lançamento para este ano." : ""}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all flex items-center gap-2 relative ${isSelected
                        ? 'bg-primary border-primary text-white shadow-sm'
                        : isUsed
                          ? 'bg-gray-100 dark:bg-[#1a2634] border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : 'bg-white dark:bg-[#1a2634] border-gray-200 dark:border-gray-700 text-[#617289] dark:text-[#9ca3af] hover:border-primary/50'
                        }`}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      )}
                      {isUsed && (
                        <span className="material-symbols-outlined text-[14px]">block</span>
                      )}
                      {seq}
                    </button>
                  );
                })}
              </div>
              {formData.selectedSequentials.length === 0 && (
                <p className="text-[10px] text-red-500 font-bold animate-pulse">
                  * Selecione pelo menos um sequencial para este lançamento
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase tracking-tighter">Valor Cota Única (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.singleValue}
                onChange={e => setFormData({ ...formData, singleValue: parseFloat(e.target.value) })}
                className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase tracking-tighter">Valor Total Parcelado (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.installmentValue}
                onChange={e => setFormData({ ...formData, installmentValue: parseFloat(e.target.value) })}
                className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase tracking-tighter">Forma Escolhida</label>
              <select
                value={formData.chosenMethod}
                onChange={e => setFormData({ ...formData, chosenMethod: e.target.value as PaymentMethod })}
                className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-[#111418] dark:text-white text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Cota Única" className="bg-white dark:bg-[#1a2634] text-[#111418] dark:text-white">Cota Única</option>
                <option value="Parcelado" className="bg-white dark:bg-[#1a2634] text-[#111418] dark:text-white">Parcelado</option>
                <option value="Em aberto" className="bg-white dark:bg-[#1a2634] text-[#111418] dark:text-white">Em aberto</option>
              </select>
            </div>

            {formData.chosenMethod === 'Parcelado' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase tracking-tighter">Qtd de Parcelas</label>
                <input
                  type="number"
                  min="2"
                  max="12"
                  required
                  value={formData.installmentsCount}
                  onChange={e => setFormData({ ...formData, installmentsCount: parseInt(e.target.value) })}
                  className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111418] dark:text-slate-300 uppercase tracking-tighter">Data Pagamento/Início</label>
              <input
                type="date"
                required={formData.chosenMethod !== 'Em aberto'}
                disabled={formData.chosenMethod === 'Em aberto'}
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-primary/10 rounded-xl border border-primary/30">
              <p className="text-[10px] font-bold text-[#111418] dark:text-primary uppercase tracking-tighter">Diferença (Única x Parcelado)</p>
              <p className="text-lg font-bold text-[#111418] dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(diffSingleVsParcel)}
              </p>
            </div>
            <div className={`p-4 rounded-xl border ${diffVsLastYear > 0 ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-tighter ${diffVsLastYear > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>Comparativo ({formData.year - 1})</p>
              <p className={`text-lg font-bold ${diffVsLastYear > 0 ? 'text-orange-800' : 'text-emerald-800'}`}>
                {diffVsLastYear > 0 ? '+' : ''}
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(diffVsLastYear)}
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-[#2a3644] flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 h-11 text-sm font-bold text-[#617289] hover:text-[#111418] transition-colors uppercase tracking-tight">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formData.selectedSequentials.length === 0}
              className="px-10 h-11 bg-primary text-white rounded-xl text-sm font-bold hover:bg-[#a64614] shadow-lg shadow-primary/30 transition-all uppercase tracking-tight disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {initialData ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR LANÇAMENTO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddIptuModal;

