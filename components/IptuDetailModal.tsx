
import React, { useMemo } from 'react';
import { IptuRecord, Property } from '../types';

interface IptuDetailModalProps {
  iptu: IptuRecord;
  property: Property;
  onClose: () => void;
  onEdit: () => void;
}

const IptuDetailModal: React.FC<IptuDetailModalProps> = ({ iptu, property, onClose, onEdit }) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const diffSingleVsParcel = useMemo(() => {
    return Math.abs((iptu.installmentValue || 0) - (iptu.singleValue || 0));
  }, [iptu]);

  const lastYearIptu = useMemo(() => {
    return property.iptuHistory.find(h => h.year === iptu.year - 1);
  }, [property.iptuHistory, iptu.year]);

  const diffVsLastYear = useMemo(() => {
    if (!lastYearIptu) return 0;
    return iptu.value - lastYearIptu.value;
  }, [lastYearIptu, iptu]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#1a2634] w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2a3644] overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-8 py-6 border-b-4 border-primary bg-gray-50 dark:bg-[#1e2a3b]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
              <span className="material-symbols-outlined font-semibold">description</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#111418] dark:text-white uppercase tracking-tight">Detalhamento {iptu.year}</h2>
              <p className="text-xs font-semibold text-[#617289] dark:text-[#9ca3af]">{property.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="size-10 flex items-center justify-center rounded-full bg-primary text-white hover:bg-[#a64614] transition-all shadow-sm"
              title="Editar registro"
            >
              <span className="material-symbols-outlined text-[20px] font-semibold">edit</span>
            </button>
            <button onClick={onClose} className="size-10 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors">
              <span className="material-symbols-outlined text-[20px] font-semibold">close</span>
            </button>
          </div>
        </header>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-y-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#617289] uppercase tracking-tighter">Forma Escolhida</span>
              <span className="text-sm font-bold text-secondary uppercase">{iptu.chosenMethod}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#617289] uppercase tracking-tighter">Empresa Holmes</span>
              <span className="text-sm font-bold text-[#111418] dark:text-white">{iptu.holmesCompany || 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#617289] uppercase tracking-tighter">Valor Cota Única</span>
              <span className="text-sm font-bold text-[#111418] dark:text-white">{formatCurrency(iptu.singleValue || 0)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#617289] uppercase tracking-tighter">Valor Parcelado</span>
              <span className="text-sm font-bold text-[#111418] dark:text-white">{formatCurrency(iptu.installmentValue || 0)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#617289] uppercase tracking-tighter">Parcelamento</span>
              <span className="text-sm font-bold text-[#111418] dark:text-white uppercase">
                {iptu.chosenMethod === 'Parcelado' ? `${iptu.installmentsCount}x parcelas` : 'N/A'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#617289] uppercase tracking-tighter">Data do Pagamento</span>
              <span className="text-sm font-bold text-[#111418] dark:text-white">{iptu.startDate || 'N/A'}</span>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-[#2a3644]">
            <div className="p-4 bg-primary/10 dark:bg-primary/5 rounded-xl flex items-center justify-between border border-primary/20">
              <span className="text-xs font-bold text-[#111418] dark:text-primary uppercase tracking-tighter">Diferença Única x Parcelada</span>
              <span className="text-sm font-bold text-[#111418] dark:text-white">{formatCurrency(diffSingleVsParcel)}</span>
            </div>

            <div className={`p-4 rounded-xl flex items-center justify-between border-2 ${diffVsLastYear > 0 ? 'bg-red-50 dark:bg-red-900/10 border-red-200' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200'}`}>
              <span className={`text-xs font-bold uppercase tracking-tighter ${diffVsLastYear > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Comparativo Ano Anterior</span>
              <span className={`text-sm font-bold ${diffVsLastYear > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {diffVsLastYear > 0 ? '+' : ''}{formatCurrency(diffVsLastYear)}
              </span>
            </div>
          </div>

          <div className="mt-8 p-6 bg-primary rounded-2xl border-2 border-[#a64614]/20 text-center shadow-lg">
            <span className="text-[11px] font-bold text-white/70 uppercase block mb-1 tracking-widest">VALOR FINAL LANÇADO</span>
            <span className="text-4xl font-bold text-white tracking-tight">{formatCurrency(iptu.value)}</span>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-10 h-12 bg-white dark:bg-[#2a3644] border-2 border-primary/50 text-[#111418] dark:text-white rounded-xl text-sm font-bold hover:bg-primary/10 transition-all uppercase tracking-tight"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IptuDetailModal;
