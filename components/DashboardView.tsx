
import React, { useMemo, useState } from 'react';
import { Property, IptuStatus, IptuRecord } from '../types';

interface DashboardViewProps {
  onSelectProperty: (id: string) => void;
  onAddProperty: () => void;
  properties: Property[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ onSelectProperty, onAddProperty, properties }) => {
  const currentSystemYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentSystemYear);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentSystemYear);
    years.add(currentSystemYear - 1);
    properties.forEach(p => p.iptuHistory.forEach(h => years.add(h.year)));
    return Array.from(years).sort((a, b) => b - a);
  }, [properties, currentSystemYear]);

  const getStatusInfo = (iptu: IptuRecord) => {
    if (!iptu.startDate) return { status: IptuStatus.PENDING, isPaid: false };

    const [y, m, d] = iptu.startDate.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    start.setHours(0, 0, 0, 0);

    if (iptu.chosenMethod === 'Cota Única') {
      const isPaid = start <= now;
      return {
        status: isPaid ? IptuStatus.PAID : IptuStatus.PENDING,
        isPaid
      };
    }

    if (iptu.chosenMethod === 'Parcelado') {
      const installments = iptu.installmentsCount || 1;
      const monthsSinceStart = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

      if (start > now) return { status: IptuStatus.PENDING, isPaid: false };
      if (monthsSinceStart < installments) return { status: IptuStatus.IN_PAYMENT, isPaid: true };
      return { status: IptuStatus.PAID, isPaid: true };
    }

    return { status: iptu.status, isPaid: iptu.status === IptuStatus.PAID };
  };

  const stats = useMemo(() => {
    let totalProperties = properties.length;
    let paidCotaUnica = 0;
    let totalRegularized = 0;
    let totalOpen = 0;
    let regularizedCount = 0;

    properties.forEach(p => {
      const iptu = p.iptuHistory.find(h => h.year === selectedYear);
      if (!iptu) {
        // Se não houver registro para o ano, consideramos como valor em aberto se houver histórico anterior
        return;
      }

      const { isPaid } = getStatusInfo(iptu);

      if (iptu.chosenMethod === 'Cota Única') {
        if (isPaid) {
          totalRegularized += iptu.value;
          paidCotaUnica++;
          regularizedCount++;
        } else {
          totalOpen += iptu.value;
        }
      } else if (iptu.chosenMethod === 'Parcelado') {
        const installments = iptu.installmentsCount || 1;
        const totalValue = iptu.installmentValue || iptu.value;
        const installmentPrice = totalValue / installments;

        const [y, m, d] = iptu.startDate!.split('-').map(Number);
        const start = new Date(y, m - 1, d);

        if (start > now) {
          totalOpen += totalValue;
        } else {
          const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
          const paidInstallmentsCount = Math.min(diffMonths + 1, installments);
          const paidValue = paidInstallmentsCount * installmentPrice;

          totalRegularized += paidValue;
          totalOpen += (totalValue - paidValue);
          if (paidInstallmentsCount > 0) regularizedCount++;
        }
      }
    });

    const regularizationPercentage = totalProperties > 0 ? (regularizedCount / totalProperties) * 100 : 0;

    return {
      totalProperties,
      paidCotaUnica,
      totalRegularized,
      totalOpen,
      regularizationPercentage
    };
  }, [properties, selectedYear, now]);

  const cotaUnicaList = useMemo(() => {
    return properties.flatMap(p => {
      const iptu = p.iptuHistory.find(h => h.year === selectedYear && h.chosenMethod === 'Cota Única');
      return iptu ? [{ ...iptu, propertyName: p.name, propertyId: p.id }] : [];
    });
  }, [properties, selectedYear]);

  const parceladoList = useMemo(() => {
    return properties.flatMap(p => {
      const iptu = p.iptuHistory.find(h => h.year === selectedYear && h.chosenMethod === 'Parcelado');
      return iptu ? [{ ...iptu, propertyName: p.name, propertyId: p.id }] : [];
    });
  }, [properties, selectedYear]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div>
          <h1 className="text-[#111418] dark:text-white text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-[#617289] dark:text-[#9ca3af] mt-1 font-medium">Gestão inteligente e acompanhamento da carteira de IPTU.</p>
        </div>

        <div className="flex items-end gap-3 w-full md:w-auto">
          <div className="flex flex-col gap-1 flex-1 md:w-36">
            <label className="text-[10px] font-semibold text-[#617289] uppercase ml-1">Ano Base</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-10 px-3 rounded-xl border border-[#e5e7eb] dark:border-[#2a3644] bg-white dark:bg-[#1a2634] text-[#111418] dark:text-white text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
            >
              {availableYears.map(y => (
                <option key={y} value={y} className="bg-white dark:bg-[#1a2634] text-[#111418] dark:text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={onAddProperty}
            className="flex items-center gap-2 rounded-xl h-10 px-5 bg-primary hover:bg-[#a64614] transition-all text-white font-bold shadow-lg shadow-primary/30 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px] font-semibold">add</span>
            <span>Novo Imóvel</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Imóveis */}
        <div className="group flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm border-l-4 border-l-primary hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary p-2 rounded-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined font-semibold">home_work</span>
            </div>
            <p className="text-[#617289] dark:text-[#9ca3af] text-[10px] font-bold uppercase tracking-widest">Total Imóveis</p>
          </div>
          <div>
            <p className="text-[#111418] dark:text-white text-3xl font-bold tracking-tight">{stats.totalProperties}</p>
            <p className="text-[11px] font-semibold mt-1 text-[#617289] dark:text-[#9ca3af]">Unidades cadastradas</p>
          </div>
        </div>

        {/* Card 2: IPTUs Pagos */}
        <div className="group flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined font-semibold">task_alt</span>
            </div>
            <p className="text-[#617289] dark:text-[#9ca3af] text-[10px] font-bold uppercase tracking-widest">Regularização</p>
          </div>
          <div>
            <p className="text-emerald-600 text-3xl font-bold tracking-tight">{stats.regularizationPercentage.toFixed(0)}%</p>
            <p className="text-[11px] font-semibold mt-1 text-emerald-600/80">
              {stats.paidCotaUnica} quitados (cota única)
            </p>
          </div>
        </div>

        {/* Card 3: Valor Total Regularizado */}
        <div className="group flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined font-semibold">payments</span>
            </div>
            <p className="text-[#617289] dark:text-[#9ca3af] text-[10px] font-bold uppercase tracking-widest">Regularizado</p>
          </div>
          <div>
            <p className="text-[#111418] dark:text-white text-2xl font-bold tracking-tight">{formatCurrency(stats.totalRegularized)}</p>
            <p className="text-[11px] font-semibold mt-1 text-blue-600">Total liquidado em {selectedYear}</p>
          </div>
        </div>

        {/* Card 4: Valor em Aberto */}
        <div className="group flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 text-red-500 p-2 rounded-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined font-semibold">pending_actions</span>
            </div>
            <p className="text-[#617289] dark:text-[#9ca3af] text-[10px] font-bold uppercase tracking-widest">Em Aberto</p>
          </div>
          <div>
            <p className="text-red-600 text-2xl font-bold tracking-tight">{formatCurrency(stats.totalOpen)}</p>
            <p className="text-[11px] font-semibold mt-1 text-red-500/80">Projeção pendente anual</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-primary pb-2">
            <span className="material-symbols-outlined text-primary font-semibold">done_all</span>
            <h2 className="text-[#111418] dark:text-white text-lg font-bold uppercase tracking-tight">Cota Única - {selectedYear}</h2>
          </div>
          <div className="bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-[#22303e] border-b border-[#e5e7eb] dark:border-[#2a3644]">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#617289] dark:text-[#9ca3af]">Imóvel</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#617289] dark:text-[#9ca3af]">Valor</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase text-[#617289] dark:text-[#9ca3af]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#2a3644]">
                  {cotaUnicaList.length > 0 ? cotaUnicaList.map((iptu, idx) => {
                    const { status } = getStatusInfo(iptu as any);
                    return (
                      <tr key={idx} className="hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer transition-colors" onClick={() => onSelectProperty(iptu.propertyId)}>
                        <td className="px-4 py-3 text-sm font-semibold text-[#111418] dark:text-white truncate max-w-[150px]">{(iptu as any).propertyName}</td>
                        <td className="px-4 py-3 text-sm font-bold text-[#617289] dark:text-[#9ca3af]">{formatCurrency(iptu.value)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${status === IptuStatus.PAID ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-xs text-gray-500 italic">Sem registros de cota única para {selectedYear}.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-primary pb-2">
            <span className="material-symbols-outlined text-primary font-semibold">schedule</span>
            <h2 className="text-[#111418] dark:text-white text-lg font-bold uppercase tracking-tight">Parcelados - {selectedYear}</h2>
          </div>
          <div className="bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-[#22303e] border-b border-[#e5e7eb] dark:border-[#2a3644]">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#617289] dark:text-[#9ca3af]">Imóvel</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#617289] dark:text-[#9ca3af]">Parcelas</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase text-[#617289] dark:text-[#9ca3af]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#2a3644]">
                  {parceladoList.length > 0 ? parceladoList.map((iptu, idx) => {
                    const { status } = getStatusInfo(iptu as any);
                    const installmentValue = (iptu.installmentValue || iptu.value) / (iptu.installmentsCount || 1);
                    return (
                      <tr key={idx} className="hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer transition-colors" onClick={() => onSelectProperty(iptu.propertyId)}>
                        <td className="px-4 py-3 text-sm font-semibold text-[#111418] dark:text-white truncate max-w-[150px]">{(iptu as any).propertyName}</td>
                        <td className="px-4 py-3 text-sm font-bold text-[#617289] dark:text-[#9ca3af]">{iptu.installmentsCount}x de {formatCurrency(installmentValue)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${status === IptuStatus.PAID ? 'bg-emerald-100 text-emerald-700' :
                            status === IptuStatus.IN_PAYMENT ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-xs text-gray-500 italic">Sem registros de parcelamento para {selectedYear}.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
