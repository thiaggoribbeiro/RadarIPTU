
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
  const [selectedCityForComparison, setSelectedCityForComparison] = useState<string>('Todas');


  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentSystemYear);
    years.add(currentSystemYear - 1);
    properties.forEach(p => {
      p.iptuHistory.forEach(h => years.add(h.year));
      p.units.forEach(u => years.add(u.year));
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [properties, currentSystemYear]);

  const getUnitStatusInfo = (unit: any) => {
    const status = unit.status;
    return {
      status,
      isPaid: status === IptuStatus.PAID
    };
  };

  const stats = useMemo(() => {
    let totalProperties = properties.length;
    let totalRegularized = 0;
    let totalOpen = 0;
    let irregularCount = 0;

    properties.forEach(p => {
      const yearUnits = p.units.filter(u => u.year === selectedYear);
      let propertyHasOpen = false;

      if (yearUnits.length === 0) return;

      yearUnits.forEach(unit => {
        const isPaid = unit.status === IptuStatus.PAID;
        const value = unit.chosenMethod === 'Parcelado' ? (unit.installmentValue || 0) : (unit.singleValue || 0);

        if (isPaid) {
          totalRegularized += value;
        } else {
          totalOpen += value;
          propertyHasOpen = true;
        }
      });

      if (propertyHasOpen) {
        irregularCount++;
      }
    });

    const totalIptuValue = totalRegularized + totalOpen;
    const adimplenciaPercentage = totalIptuValue > 0 ? (totalRegularized / totalIptuValue) * 100 : 0;

    return {
      totalProperties,
      totalIptuValue,
      totalRegularized,
      totalOpen,
      adimplenciaPercentage,
      irregularCount
    };
  }, [properties, selectedYear]);

  const cotaUnicaList = useMemo(() => {
    return properties.flatMap(p => {
      const yearUnits = p.units.filter(u => u.year === selectedYear && u.chosenMethod === 'Cota Única');
      return yearUnits.map(u => ({ ...u, propertyName: p.name, propertyId: p.id, value: u.singleValue }));
    });
  }, [properties, selectedYear]);

  const parceladoList = useMemo(() => {
    return properties.flatMap(p => {
      const yearUnits = p.units.filter(u => u.year === selectedYear && u.chosenMethod === 'Parcelado');
      return yearUnits.map(u => ({ ...u, propertyName: p.name, propertyId: p.id, value: u.installmentValue }));
    });
  }, [properties, selectedYear]);

  // Dados para gráfico de rosca: Método de Pagamento (Cota Única vs Parcelado)
  const paymentMethodData = useMemo(() => {
    let cotaUnicaCount = 0;
    let parceladoCount = 0;

    properties.forEach(p => {
      p.units.forEach(u => {
        if (u.year === selectedYear) {
          if (u.chosenMethod === 'Cota Única') cotaUnicaCount++;
          else if (u.chosenMethod === 'Parcelado') parceladoCount++;
        }
      });
    });

    const total = cotaUnicaCount + parceladoCount;
    return {
      cotaUnica: { count: cotaUnicaCount, percentage: total > 0 ? (cotaUnicaCount / total) * 100 : 0 },
      parcelado: { count: parceladoCount, percentage: total > 0 ? (parceladoCount / total) * 100 : 0 },
      total
    };
  }, [properties, selectedYear]);

  // Dados para gráfico de rosca: Status de Pagamento
  const statusData = useMemo(() => {
    let paid = 0;
    let inProgress = 0;
    let pending = 0;
    let open = 0;

    properties.forEach(p => {
      p.units.forEach(u => {
        if (u.year === selectedYear) {
          switch (u.status) {
            case IptuStatus.PAID: paid++; break;
            case IptuStatus.IN_PROGRESS: inProgress++; break;
            case IptuStatus.PENDING: pending++; break;
            case IptuStatus.OPEN: open++; break;
          }
        }
      });
    });

    const total = paid + inProgress + pending + open;
    return {
      paid: { count: paid, percentage: total > 0 ? (paid / total) * 100 : 0 },
      inProgress: { count: inProgress, percentage: total > 0 ? (inProgress / total) * 100 : 0 },
      pending: { count: pending, percentage: total > 0 ? (pending / total) * 100 : 0 },
      open: { count: open, percentage: total > 0 ? (open / total) * 100 : 0 },
      total
    };
  }, [properties, selectedYear]);

  // Função para normalizar nome de cidade (primeira letra maiúscula, restante minúscula)
  const normalizeCity = (city: string) => {
    if (!city) return '';
    return city.trim().toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  };

  const rankings = useMemo(() => {
    const cityMap: Record<string, number> = {};
    const stateMap: Record<string, number> = {};

    properties.forEach(p => {
      const yearUnits = p.units.filter(u => u.year === selectedYear);
      const totalValue = yearUnits.reduce((acc, u) => {
        return acc + (u.chosenMethod === 'Parcelado' ? (u.installmentValue || 0) : (u.singleValue || 0));
      }, 0);

      if (totalValue > 0) {
        if (p.city) {
          const normalizedCity = normalizeCity(p.city);
          cityMap[normalizedCity] = (cityMap[normalizedCity] || 0) + totalValue;
        }
        if (p.state) stateMap[p.state.toUpperCase()] = (stateMap[p.state.toUpperCase()] || 0) + totalValue;
      }
    });

    const sortByValue = (arr: { label: string, value: number }[]) =>
      arr.sort((a, b) => b.value - a.value);

    return {
      cities: sortByValue(Object.entries(cityMap).map(([label, value]) => ({ label, value }))),
      states: sortByValue(Object.entries(stateMap).map(([label, value]) => ({ label, value })))
    };
  }, [properties, selectedYear]);

  const comparisonData = useMemo(() => {
    const prevYear = selectedYear - 1;
    const filteredProperties = selectedCityForComparison === 'Todas'
      ? properties
      : properties.filter(p => p.city === selectedCityForComparison);

    const getTotals = (year: number) => {
      let single = 0;
      let installment = 0;
      filteredProperties.forEach(p => {
        p.units.forEach(u => {
          if (u.year === year) {
            if (u.chosenMethod === 'Cota Única') single += u.singleValue || 0;
            if (u.chosenMethod === 'Parcelado') installment += u.installmentValue || 0;
          }
        });
      });
      return { single, installment, total: single + installment };
    };

    const currentTotals = getTotals(selectedYear);
    const prevTotals = getTotals(prevYear);

    const calcDiff = (curr: number, prev: number) => ({
      abs: curr - prev,
      perc: prev > 0 ? ((curr - prev) / prev) * 100 : 0
    });

    return {
      current: currentTotals,
      previous: prevTotals,
      diff: {
        single: calcDiff(currentTotals.single, prevTotals.single),
        installment: calcDiff(currentTotals.installment, prevTotals.installment),
        total: calcDiff(currentTotals.total, prevTotals.total)
      }
    };
  }, [properties, selectedYear, selectedCityForComparison]);

  const highestIptu = useMemo(() => {
    let highestSingle = { propertyName: '-', value: 0 };
    let highestParcelado = { propertyName: '-', value: 0 };

    properties.forEach(p => {
      p.units.forEach(u => {
        if (u.year === selectedYear) {
          if (u.chosenMethod === 'Cota Única' && u.singleValue > highestSingle.value) {
            highestSingle = { propertyName: p.name, value: u.singleValue };
          }
          if (u.chosenMethod === 'Parcelado' && u.installmentValue > highestParcelado.value) {
            highestParcelado = { propertyName: p.name, value: u.installmentValue };
          }
        }
      });
    });

    return { single: highestSingle, parcelado: highestParcelado };
  }, [properties, selectedYear]);


  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const RankingItem = ({ label, value, maxValue }: { label: string, value: number, maxValue: number }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-semibold">
          <span className="text-[#111418] dark:text-gray-300 uppercase truncate max-w-[140px]">{label}</span>
          <span className="text-primary">{formatCurrency(value)}</span>
        </div>
        <div className="h-2 w-full bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-1000"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div>
          <h1 className="text-[#111418] dark:text-white text-3xl font-semibold tracking-tight">Dashboard</h1>
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
            className="flex items-center gap-2 rounded-xl h-10 px-5 bg-primary hover:bg-[#a64614] transition-all text-white font-semibold shadow-lg shadow-primary/30 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px] font-semibold">add</span>
            <span>Novo Imóvel</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* ... (cards) */}
        {/* Card 1: Total Imóveis */}
        <div className="group flex flex-col gap-3 rounded-xl p-4 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm border-l-4 border-l-primary hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined font-semibold text-[20px]">home_work</span>
            </div>
            <p className="text-[#617289] dark:text-[#9ca3af] text-[9px] font-bold uppercase tracking-widest">Total de Imóveis</p>
          </div>
          <div>
            <p className="text-[#111418] dark:text-white text-2xl font-bold tracking-tight">{stats.totalProperties}</p>
            <p className="text-[10px] font-semibold mt-0.5 text-[#617289] dark:text-[#9ca3af]">Carteira completa</p>
          </div>
        </div>

        {/* Card 2: Valor Total de IPTU */}
        <div className="group flex flex-col gap-3 rounded-xl p-4 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm border-l-4 border-l-indigo-500 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined font-semibold text-[20px]">account_balance_wallet</span>
            </div>
            <p className="text-[#617289] dark:text-[#9ca3af] text-[9px] font-bold uppercase tracking-widest">Valor Total de IPTU</p>
          </div>
          <div>
            <p className="text-[#111418] dark:text-white text-xl font-bold tracking-tight">{formatCurrency(stats.totalIptuValue)}</p>
            <p className="text-[10px] font-semibold mt-0.5 text-indigo-600">Referência: {selectedYear}</p>
          </div>
        </div>

        {/* Card 3: Valor Regularizado */}
        <div className="group flex flex-col gap-3 rounded-xl p-4 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined font-semibold text-[20px]">check_circle</span>
            </div>
            <p className="text-[#617289] dark:text-[#9ca3af] text-[9px] font-bold uppercase tracking-widest">Valor Regularizado</p>
          </div>
          <div>
            <p className="text-emerald-600 text-xl font-bold tracking-tight">{formatCurrency(stats.totalRegularized)}</p>
            <p className="text-[10px] font-semibold mt-0.5 text-emerald-600/80">Total liquidado ou em dia</p>
          </div>
        </div>

        {/* Card 4: Valor em Aberto */}
        <div className="group flex flex-col gap-3 rounded-xl p-4 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5">
            <div className="bg-red-50 text-red-500 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined font-semibold text-[20px]">pending_actions</span>
            </div>
            <p className="text-[#617289] dark:text-[#9ca3af] text-[9px] font-bold uppercase tracking-widest">Valor em Aberto</p>
          </div>
          <div>
            <p className="text-red-600 text-xl font-bold tracking-tight">{formatCurrency(stats.totalOpen)}</p>
            <p className="text-[10px] font-semibold mt-0.5 text-red-500/80">Pendente de pagamento</p>
          </div>
        </div>

        {/* Card 5: % de Adimplência da Carteira */}
        <div className="group flex flex-col gap-3 rounded-xl p-4 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined font-semibold text-[20px]">trending_up</span>
            </div>
            <p className="text-[#617289] dark:text-[#9ca3af] text-[9px] font-bold uppercase tracking-widest">% Adimplência</p>
          </div>
          <div>
            <p className="text-blue-600 text-2xl font-bold tracking-tight">{stats.adimplenciaPercentage.toFixed(1)}%</p>
            <p className="text-[10px] font-semibold mt-0.5 text-blue-600/80">Saúde financeira</p>
          </div>
        </div>

        {/* Card 6: Qtd. de Imóveis Irregulares */}
        <div className="group flex flex-col gap-3 rounded-xl p-4 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm border-l-4 border-l-orange-500 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5">
            <div className="bg-orange-50 text-orange-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined font-semibold text-[20px]">warning</span>
            </div>
            <p className="text-[#617289] dark:text-[#9ca3af] text-[9px] font-bold uppercase tracking-widest">Imóveis Irregulares</p>
          </div>
          <div>
            <p className="text-orange-600 text-2xl font-bold tracking-tight">{stats.irregularCount}</p>
            <p className="text-[10px] font-semibold mt-0.5 text-orange-600/80">Com pendências</p>
          </div>
        </div>

        {/* Card 7: IPTU mais alto Cota Única */}
        <div className="group flex flex-col gap-3 rounded-xl p-4 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm border-l-4 border-l-amber-500 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-50 text-amber-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined font-semibold text-[20px]">star</span>
            </div>
            <p className="text-[#617289] dark:text-[#9ca3af] text-[9px] font-bold uppercase tracking-widest">Maior Cota Única</p>
          </div>
          <div>
            <p className="text-amber-600 text-sm font-bold tracking-tight truncate mb-0.5" title={highestIptu.single.propertyName}>
              {highestIptu.single.propertyName}
            </p>
            <p className="text-[#111418] dark:text-white text-base font-bold">{formatCurrency(highestIptu.single.value)}</p>
          </div>
        </div>

        {/* Card 8: IPTU mais alto Parcelado */}
        <div className="group flex flex-col gap-3 rounded-xl p-4 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm border-l-4 border-l-cyan-500 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5">
            <div className="bg-cyan-50 text-cyan-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined font-semibold text-[20px]">star_half</span>
            </div>
            <p className="text-[#617289] dark:text-[#9ca3af] text-[9px] font-bold uppercase tracking-widest">Maior Parcelado</p>
          </div>
          <div>
            <p className="text-cyan-600 text-sm font-bold tracking-tight truncate mb-0.5" title={highestIptu.parcelado.propertyName}>
              {highestIptu.parcelado.propertyName}
            </p>
            <p className="text-[#111418] dark:text-white text-base font-bold">{formatCurrency(highestIptu.parcelado.value)}</p>
          </div>
        </div>
      </div>


      {/* Comparativo Anual */}
      <div className="bg-white dark:bg-[#1a2634] p-8 rounded-2xl border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#e5e7eb] dark:border-[#2a3644] pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary p-2 rounded-lg">
              <span className="material-symbols-outlined font-semibold">analytics</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#111418] dark:text-white uppercase tracking-tight">Comparativo Anual ({selectedYear - 1} vs {selectedYear})</h3>
              <p className="text-xs text-[#617289] dark:text-[#9ca3af] font-medium">Análise de variação de valores entre os anos.</p>
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full md:w-64">
            <label className="text-[10px] font-semibold text-[#617289] uppercase ml-1">Filtro por Cidade</label>
            <select
              value={selectedCityForComparison}
              onChange={(e) => setSelectedCityForComparison(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#e5e7eb] dark:border-[#2a3644] bg-white dark:bg-[#1a2634] text-[#111418] dark:text-white text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
            >
              <option value="Todas">Todas as Cidades</option>
              {rankings.cities.map(c => (
                <option key={c.label} value={c.label}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50">
            <p className="text-[10px] font-bold text-[#617289] uppercase tracking-widest mb-3">Variação Total</p>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-bold text-[#111418] dark:text-white">{formatCurrency(comparisonData.current.total)}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${comparisonData.diff.total.perc >= 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {comparisonData.diff.total.perc >= 0 ? '+' : ''}{comparisonData.diff.total.perc.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#617289]">vs {formatCurrency(comparisonData.previous.total)} no ano anterior</p>
            </div>
          </div>

          {/* Cota Única */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50">
            <p className="text-[10px] font-bold text-[#617289] uppercase tracking-widest mb-3">Cota Única</p>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-bold text-[#111418] dark:text-white">{formatCurrency(comparisonData.current.single)}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${comparisonData.diff.single.perc >= 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {comparisonData.diff.single.perc >= 0 ? '+' : ''}{comparisonData.diff.single.perc.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#617289]">vs {formatCurrency(comparisonData.previous.single)} anterior</p>
            </div>
          </div>

          {/* Parcelado */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50">
            <p className="text-[10px] font-bold text-[#617289] uppercase tracking-widest mb-3">Parcelado</p>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-bold text-[#111418] dark:text-white">{formatCurrency(comparisonData.current.installment)}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${comparisonData.diff.installment.perc >= 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {comparisonData.diff.installment.perc >= 0 ? '+' : ''}{comparisonData.diff.installment.perc.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#617289]">vs {formatCurrency(comparisonData.previous.installment)} anterior</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ranking por Cidades */}
        <div className="bg-white dark:bg-[#1a2634] p-6 rounded-2xl border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-[#e5e7eb] dark:border-[#2a3644] pb-4">
            <div className="bg-primary/10 text-primary p-2 rounded-lg">
              <span className="material-symbols-outlined font-semibold">location_city</span>
            </div>
            <h3 className="text-lg font-semibold text-[#111418] dark:text-white uppercase tracking-tight">Soma de IPTUs por Cidade</h3>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {rankings.cities.length > 0 ? (
              rankings.cities.map((city, idx) => (
                <RankingItem key={idx} label={city.label} value={city.value} maxValue={rankings.cities[0].value} />
              ))
            ) : (
              <p className="text-xs text-[#617289] italic text-center py-10">Buscando dados geográficos...</p>
            )}
          </div>
        </div>

        {/* Ranking por Estados */}
        <div className="bg-white dark:bg-[#1a2634] p-6 rounded-2xl border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-[#e5e7eb] dark:border-[#2a3644] pb-4">
            <div className="bg-primary/10 text-primary p-2 rounded-lg">
              <span className="material-symbols-outlined font-semibold">map</span>
            </div>
            <h3 className="text-lg font-bold text-[#111418] dark:text-white uppercase tracking-tight">Soma de IPTUs por Estado</h3>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {rankings.states.length > 0 ? (
              rankings.states.map((state, idx) => (
                <RankingItem key={idx} label={state.label} value={state.value} maxValue={rankings.states[0].value} />
              ))
            ) : (
              <p className="text-xs text-[#617289] italic text-center py-10">Buscando dados geográficos...</p>
            )}
          </div>
        </div>
      </div>

      {/* Gráficos de Rosca */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico: Método de Pagamento */}
        <div className="bg-white dark:bg-[#1a2634] p-6 rounded-2xl border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#e5e7eb] dark:border-[#2a3644] pb-4 mb-6">
            <div className="bg-primary/10 text-primary p-2 rounded-lg">
              <span className="material-symbols-outlined font-semibold">pie_chart</span>
            </div>
            <h3 className="text-lg font-semibold text-[#111418] dark:text-white uppercase tracking-tight">Método de Pagamento</h3>
          </div>

          <div className="flex items-center justify-center gap-8">
            {/* Gráfico de Rosca */}
            <div className="relative">
              <div
                className="w-40 h-40 rounded-full"
                style={{
                  background: paymentMethodData.total > 0
                    ? `conic-gradient(
                        #10b981 0deg ${paymentMethodData.cotaUnica.percentage * 3.6}deg,
                        #6366f1 ${paymentMethodData.cotaUnica.percentage * 3.6}deg 360deg
                      )`
                    : '#e5e7eb'
                }}
              />
              <div className="absolute inset-4 bg-white dark:bg-[#1a2634] rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-[#111418] dark:text-white">{paymentMethodData.total}</span>
              </div>
            </div>

            {/* Legenda */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                <div>
                  <p className="text-sm font-semibold text-[#111418] dark:text-white">Cota Única</p>
                  <p className="text-xs text-[#617289]">{paymentMethodData.cotaUnica.count} ({paymentMethodData.cotaUnica.percentage.toFixed(1)}%)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-indigo-500"></div>
                <div>
                  <p className="text-sm font-semibold text-[#111418] dark:text-white">Parcelado</p>
                  <p className="text-xs text-[#617289]">{paymentMethodData.parcelado.count} ({paymentMethodData.parcelado.percentage.toFixed(1)}%)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico: Status de Pagamento */}
        <div className="bg-white dark:bg-[#1a2634] p-6 rounded-2xl border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#e5e7eb] dark:border-[#2a3644] pb-4 mb-6">
            <div className="bg-primary/10 text-primary p-2 rounded-lg">
              <span className="material-symbols-outlined font-semibold">donut_large</span>
            </div>
            <h3 className="text-lg font-semibold text-[#111418] dark:text-white uppercase tracking-tight">Status de Pagamento</h3>
          </div>

          <div className="flex items-center justify-center gap-8">
            {/* Gráfico de Rosca */}
            <div className="relative">
              <div
                className="w-40 h-40 rounded-full"
                style={{
                  background: statusData.total > 0
                    ? `conic-gradient(
                        #10b981 0deg ${statusData.paid.percentage * 3.6}deg,
                        #3b82f6 ${statusData.paid.percentage * 3.6}deg ${(statusData.paid.percentage + statusData.inProgress.percentage) * 3.6}deg,
                        #f59e0b ${(statusData.paid.percentage + statusData.inProgress.percentage) * 3.6}deg ${(statusData.paid.percentage + statusData.inProgress.percentage + statusData.pending.percentage) * 3.6}deg,
                        #ef4444 ${(statusData.paid.percentage + statusData.inProgress.percentage + statusData.pending.percentage) * 3.6}deg 360deg
                      )`
                    : '#e5e7eb'
                }}
              />
              <div className="absolute inset-4 bg-white dark:bg-[#1a2634] rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-[#111418] dark:text-white">{statusData.total}</span>
              </div>
            </div>

            {/* Legenda */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                <div>
                  <p className="text-sm font-semibold text-[#111418] dark:text-white">Pago</p>
                  <p className="text-xs text-[#617289]">{statusData.paid.count} ({statusData.paid.percentage.toFixed(1)}%)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <div>
                  <p className="text-sm font-semibold text-[#111418] dark:text-white">Em andamento</p>
                  <p className="text-xs text-[#617289]">{statusData.inProgress.count} ({statusData.inProgress.percentage.toFixed(1)}%)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                <div>
                  <p className="text-sm font-semibold text-[#111418] dark:text-white">Pendente</p>
                  <p className="text-xs text-[#617289]">{statusData.pending.count} ({statusData.pending.percentage.toFixed(1)}%)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <div>
                  <p className="text-sm font-semibold text-[#111418] dark:text-white">Em aberto</p>
                  <p className="text-xs text-[#617289]">{statusData.open.count} ({statusData.open.percentage.toFixed(1)}%)</p>
                </div>
              </div>
            </div>
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
                  {cotaUnicaList.length > 0 ? cotaUnicaList.map((unit, idx) => {
                    return (
                      <tr key={idx} className="hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer transition-colors" onClick={() => onSelectProperty(unit.propertyId)}>
                        <td className="px-4 py-3 text-sm font-semibold text-[#111418] dark:text-white truncate max-w-[150px]">{(unit as any).propertyName}</td>
                        <td className="px-4 py-3 text-sm font-bold text-[#617289] dark:text-[#9ca3af]">{formatCurrency(unit.value)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${unit.status === IptuStatus.PAID ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                            {unit.status}
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
                  {parceladoList.length > 0 ? parceladoList.map((unit, idx) => {
                    const installmentValue = (unit.installmentValue || unit.value) / (unit.installmentsCount || 1);
                    return (
                      <tr key={idx} className="hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer transition-colors" onClick={() => onSelectProperty(unit.propertyId)}>
                        <td className="px-4 py-3 text-sm font-semibold text-[#111418] dark:text-white truncate max-w-[150px]">{(unit as any).propertyName}</td>
                        <td className="px-4 py-3 text-sm font-bold text-[#617289] dark:text-[#9ca3af]">{unit.installmentsCount}x de {formatCurrency(installmentValue)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${unit.status === IptuStatus.PAID ? 'bg-emerald-100 text-emerald-700' :
                            unit.status === IptuStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                            {unit.status}
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
