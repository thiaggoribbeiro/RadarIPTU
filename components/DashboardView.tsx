
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


  // Dados para gráfico de rosca: Método de Pagamento (Cota Única vs Parcelado)
  const paymentMethodData = useMemo(() => {
    let cotaUnicaCount = 0;
    let parceladoCount = 0;
    let undefinedCount = 0;

    properties.forEach(p => {
      p.units.forEach(u => {
        if (u.year === selectedYear) {
          if (u.chosenMethod === 'Cota Única') cotaUnicaCount++;
          else if (u.chosenMethod === 'Parcelado') parceladoCount++;
          else if (u.chosenMethod === 'Indefinido') undefinedCount++;
        }
      });
    });

    const total = cotaUnicaCount + parceladoCount + undefinedCount;
    return {
      cotaUnica: { count: cotaUnicaCount, percentage: total > 0 ? (cotaUnicaCount / total) * 100 : 0 },
      parcelado: { count: parceladoCount, percentage: total > 0 ? (parceladoCount / total) * 100 : 0 },
      undefined: { count: undefinedCount, percentage: total > 0 ? (undefinedCount / total) * 100 : 0 },
      total
    };
  }, [properties, selectedYear]);

  // Dados para gráfico de rosca: Status de Pagamento
  const statusData = useMemo(() => {
    let paid = 0;
    let inProgress = 0;
    let pending = 0;
    let open = 0;
    let inAnalysis = 0;
    let launched = 0;
    let undefinedStatus = 0;

    properties.forEach(p => {
      p.units.forEach(u => {
        if (u.year === selectedYear) {
          switch (u.status) {
            case IptuStatus.PAID: paid++; break;
            case IptuStatus.IN_PROGRESS: inProgress++; break;
            case IptuStatus.PENDING: pending++; break;
            case IptuStatus.OPEN: open++; break;
            case IptuStatus.IN_ANALYSIS: inAnalysis++; break;
            case IptuStatus.LAUNCHED: launched++; break;
            case IptuStatus.UNDEFINED: undefinedStatus++; break;
          }
        }
      });
    });

    const total = paid + inProgress + pending + open + inAnalysis + launched + undefinedStatus;
    return {
      paid: { count: paid, percentage: total > 0 ? (paid / total) * 100 : 0 },
      inProgress: { count: inProgress, percentage: total > 0 ? (inProgress / total) * 100 : 0 },
      pending: { count: pending, percentage: total > 0 ? (pending / total) * 100 : 0 },
      open: { count: open, percentage: total > 0 ? (open / total) * 100 : 0 },
      inAnalysis: { count: inAnalysis, percentage: total > 0 ? (inAnalysis / total) * 100 : 0 },
      launched: { count: launched, percentage: total > 0 ? (launched / total) * 100 : 0 },
      undefined: { count: undefinedStatus, percentage: total > 0 ? (undefinedStatus / total) * 100 : 0 },
      total
    };
  }, [properties, selectedYear]);

  // Dados para disponibilidade de IPTU
  const availabilityData = useMemo(() => {
    let definedCount = 0;
    let notAvailableCount = 0;
    let notFilledCount = 0;

    properties.forEach(p => {
      p.units.forEach(u => {
        if (u.year === selectedYear) {
          if (u.iptuNotAvailable) {
            notAvailableCount++;
          } else if (u.dueDate) {
            definedCount++;
          } else {
            notFilledCount++;
          }
        }
      });
    });

    const total = definedCount + notAvailableCount + notFilledCount;
    return {
      defined: { count: definedCount, percentage: total > 0 ? (definedCount / total) * 100 : 0 },
      notAvailable: { count: notAvailableCount, percentage: total > 0 ? (notAvailableCount / total) * 100 : 0 },
      notFilled: { count: notFilledCount, percentage: total > 0 ? (notFilledCount / total) * 100 : 0 },
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
        <div className="group flex flex-col gap-3 rounded-xl p-4 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm border-l-4 border-l-primary hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined font-semibold text-[20px]">account_balance_wallet</span>
            </div>
            <p className="text-[#617289] dark:text-[#9ca3af] text-[9px] font-bold uppercase tracking-widest">Valor Total de IPTU</p>
          </div>
          <div>
            <p className="text-[#111418] dark:text-white text-xl font-bold tracking-tight">{formatCurrency(stats.totalIptuValue)}</p>
            <p className="text-[10px] font-semibold mt-0.5 text-[#617289] dark:text-[#9ca3af]">Referência: {selectedYear}</p>
          </div>
        </div>

        {/* Card 3: Valor Regularizado */}
        <div className="group flex flex-col gap-3 rounded-xl p-4 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm border-l-4 border-l-primary hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined font-semibold text-[20px]">check_circle</span>
            </div>
            <p className="text-[#617289] dark:text-[#9ca3af] text-[9px] font-bold uppercase tracking-widest">Valor Regularizado</p>
          </div>
          <div>
            <p className="text-[#111418] dark:text-white text-xl font-bold tracking-tight">{formatCurrency(stats.totalRegularized)}</p>
            <p className="text-[10px] font-semibold mt-0.5 text-[#617289] dark:text-[#9ca3af]">Total liquidado ou em dia</p>
          </div>
        </div>

        {/* Card 4: % de Adimplência da Carteira */}
        <div className="group flex flex-col gap-3 rounded-xl p-4 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm border-l-4 border-l-primary hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined font-semibold text-[20px]">trending_up</span>
            </div>
            <p className="text-[#617289] dark:text-[#9ca3af] text-[9px] font-bold uppercase tracking-widest">% Adimplência</p>
          </div>
          <div>
            <p className="text-[#111418] dark:text-white text-2xl font-bold tracking-tight">{stats.adimplenciaPercentage.toFixed(1)}%</p>
            <p className="text-[10px] font-semibold mt-0.5 text-[#617289] dark:text-[#9ca3af]">Saúde financeira</p>
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

      {/* Controle de Disponibilidade e Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Widget de Disponibilidade */}
        <div className="bg-white dark:bg-[#1a2634] p-6 rounded-2xl border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm flex flex-col">
          <div className="flex items-center gap-3 border-b border-[#e5e7eb] dark:border-[#2a3644] pb-4 mb-6">
            <div className="bg-primary/10 text-primary p-2 rounded-lg">
              <span className="material-symbols-outlined font-semibold">event_available</span>
            </div>
            <h3 className="text-lg font-semibold text-[#111418] dark:text-white uppercase tracking-tight">Status de Disponibilidade</h3>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-6">
            {/* Gráfico de Barras Horizontal Empilhado */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-1000"
                  style={{ width: `${availabilityData.defined.percentage}%` }}
                  title={`Definido: ${availabilityData.defined.count}`}
                />
                <div
                  className="h-full bg-amber-500 transition-all duration-1000"
                  style={{ width: `${availabilityData.notAvailable.percentage}%` }}
                  title={`NÃO DISPONIBILIZADO: ${availabilityData.notAvailable.count}`}
                />
                <div
                  className="h-full bg-gray-400 transition-all duration-1000"
                  style={{ width: `${availabilityData.notFilled.percentage}%` }}
                  title={`Vencimento não definido: ${availabilityData.notFilled.count}`}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-[#617289] uppercase tracking-wider">
                <span>Total: {availabilityData.total} Sequenciais</span>
              </div>
            </div>

            {/* Legenda Detalhada */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10">
                <div className="flex items-center gap-3">
                  <div className="size-2 rounded-full bg-emerald-500"></div>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Vencimento Definido</span>
                </div>
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{availabilityData.defined.count}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10">
                <div className="flex items-center gap-3">
                  <div className="size-2 rounded-full bg-amber-500"></div>
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase">NÃO DISPONIBILIZADO - PREFEITURA</span>
                </div>
                <span className="text-sm font-black text-amber-700 dark:text-amber-400">{availabilityData.notAvailable.count}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-500/5 border border-gray-100 dark:border-gray-500/10">
                <div className="flex items-center gap-3">
                  <div className="size-2 rounded-full bg-gray-400"></div>
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Vencimento não definido</span>
                </div>
                <span className="text-sm font-black text-gray-500 dark:text-gray-400">{availabilityData.notFilled.count}</span>
              </div>
            </div>
          </div>
        </div>

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
                        #6366f1 ${paymentMethodData.cotaUnica.percentage * 3.6}deg ${(paymentMethodData.cotaUnica.percentage + paymentMethodData.parcelado.percentage) * 3.6}deg,
                        #94a3b8 ${(paymentMethodData.cotaUnica.percentage + paymentMethodData.parcelado.percentage) * 3.6}deg 360deg
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
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-slate-400"></div>
                <div>
                  <p className="text-sm font-semibold text-[#111418] dark:text-white">Indefinido</p>
                  <p className="text-xs text-[#617289]">{paymentMethodData.undefined.count} ({paymentMethodData.undefined.percentage.toFixed(1)}%)</p>
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
                        #ef4444 0deg ${statusData.open.percentage * 3.6}deg,
                        #f59e0b ${statusData.open.percentage * 3.6}deg ${(statusData.open.percentage + statusData.inAnalysis.percentage) * 3.6}deg,
                        #3b82f6 ${(statusData.open.percentage + statusData.inAnalysis.percentage) * 3.6}deg ${(statusData.open.percentage + statusData.inAnalysis.percentage + statusData.inProgress.percentage) * 3.6}deg,
                        #6366f1 ${(statusData.open.percentage + statusData.inAnalysis.percentage + statusData.inProgress.percentage) * 3.6}deg ${(statusData.open.percentage + statusData.inAnalysis.percentage + statusData.inProgress.percentage + statusData.launched.percentage) * 3.6}deg,
                        #10b981 ${(statusData.open.percentage + statusData.inAnalysis.percentage + statusData.inProgress.percentage + statusData.launched.percentage) * 3.6}deg ${(statusData.open.percentage + statusData.inAnalysis.percentage + statusData.inProgress.percentage + statusData.launched.percentage + statusData.paid.percentage) * 3.6}deg,
                        #f97316 ${(statusData.open.percentage + statusData.inAnalysis.percentage + statusData.inProgress.percentage + statusData.launched.percentage + statusData.paid.percentage) * 3.6}deg ${(statusData.open.percentage + statusData.inAnalysis.percentage + statusData.inProgress.percentage + statusData.launched.percentage + statusData.paid.percentage + statusData.pending.percentage) * 3.6}deg,
                        #94a3b8 ${(statusData.open.percentage + statusData.inAnalysis.percentage + statusData.inProgress.percentage + statusData.launched.percentage + statusData.paid.percentage + statusData.pending.percentage) * 3.6}deg 360deg
                      )`
                    : '#e5e7eb'
                }}
              />
              <div className="absolute inset-4 bg-white dark:bg-[#1a2634] rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-[#111418] dark:text-white">{statusData.total}</span>
              </div>
            </div>

            {/* Legenda */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div>
                  <p className="text-[10px] font-bold text-[#111418] dark:text-white uppercase">Aberto</p>
                  <p className="text-[9px] text-[#617289]">{statusData.open.count} ({statusData.open.percentage.toFixed(1)}%)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div>
                  <p className="text-[10px] font-bold text-[#111418] dark:text-white uppercase">Em análise</p>
                  <p className="text-[9px] text-[#617289]">{statusData.inAnalysis.count} ({statusData.inAnalysis.percentage.toFixed(1)}%)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <div>
                  <p className="text-[10px] font-bold text-[#111418] dark:text-white uppercase">Em andamento</p>
                  <p className="text-[9px] text-[#617289]">{statusData.inProgress.count} ({statusData.inProgress.percentage.toFixed(1)}%)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                <div>
                  <p className="text-[10px] font-bold text-[#111418] dark:text-white uppercase">Lançado</p>
                  <p className="text-[9px] text-[#617289]">{statusData.launched.count} ({statusData.launched.percentage.toFixed(1)}%)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <div>
                  <p className="text-[10px] font-bold text-[#111418] dark:text-white uppercase">Pago</p>
                  <p className="text-[9px] text-[#617289]">{statusData.paid.count} ({statusData.paid.percentage.toFixed(1)}%)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <div>
                  <p className="text-[10px] font-bold text-[#111418] dark:text-white uppercase">Pendente</p>
                  <p className="text-[9px] text-[#617289]">{statusData.pending.count} ({statusData.pending.percentage.toFixed(1)}%)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                <div>
                  <p className="text-[10px] font-bold text-[#111418] dark:text-white uppercase">Indefinido</p>
                  <p className="text-[9px] text-[#617289]">{statusData.undefined.count} ({statusData.undefined.percentage.toFixed(1)}%)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardView;
