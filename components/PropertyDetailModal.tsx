import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo-report.png';
import { Property, IptuRecord, UserRole, IptuStatus } from '../types';
import AddIptuModal from './AddIptuModal';
import IptuDetailModal from './IptuDetailModal';
import { getPropertyStatus } from '../utils/iptu';

interface PropertyDetailModalProps {
  property: Property;
  userRole: UserRole;
  onClose: () => void;
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (propertyId: string) => void;
  onAddIptu: (propertyId: string, newIptu: IptuRecord) => void;
  onDeleteIptu: (propertyId: string, iptuId: string) => void;
  onDeleteUnit: (propertyId: string, sequential: string, year: number, registrationNumber?: string) => void;
  onOpenIptuConfig: (property: Property, section?: 'units' | 'tenants' | 'newCharge', year?: number, sequential?: string, registrationNumber?: string) => void;
}

const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  userRole,
  onClose,
  onEditProperty,
  onDeleteProperty,
  onAddIptu,
  onDeleteIptu,
  onDeleteUnit,
  onOpenIptuConfig
}) => {
  const [isAddIptuOpen, setIsAddIptuOpen] = useState(false);
  const [selectedIptuDetails, setSelectedIptuDetails] = useState<IptuRecord | null>(null);
  const [iptuToEdit, setIptuToEdit] = useState<IptuRecord | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    property.units.forEach(u => years.add(u.year));
    property.tenants.forEach(t => years.add(t.year));
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [property.units, property.tenants]);

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0]);

  const currentYearStatus = useMemo(() => getPropertyStatus(property, selectedYear), [property, selectedYear]);

  const handleEditIptu = (iptu: IptuRecord) => {
    setIptuToEdit(iptu);
    setSelectedIptuDetails(null);
    setIsAddIptuOpen(true);
  };

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleGenerateMirror = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Dados do Ano Selecionado
    const yearUnits = property.units.filter(u => u.year === selectedYear);
    const yearTenants = property.tenants.filter(t => t.year === selectedYear);

    const totalArea = yearTenants.reduce((acc, t) => acc + (Number(t.occupiedArea) || 0), 0);
    const yearTotalWithWaste = yearUnits.reduce((acc, u) => {
      const base = u.chosenMethod === 'Parcelado' ? (u.installmentValue || 0) : (u.singleValue || 0);
      const waste = u.hasWasteTax ? (u.wasteTaxValue || 0) : 0;
      return acc + base + waste;
    }, 0);

    // Cabeçalho do PDF
    try {
      doc.addImage(logo, 'PNG', pageWidth - 55, 10, 45, 15);
    } catch (e) {
      console.error("Erro ao carregar logo no PDF", e);
    }

    doc.setFontSize(18);
    doc.setTextColor(196, 84, 27);
    doc.setFont('helvetica', 'bold');
    doc.text(property.name.toUpperCase(), 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 110, 120);
    doc.setFont('helvetica', 'normal');
    doc.text(`Inscrição: #${property.registrationNumber}`, 14, 26);
    doc.text(`${property.address} - ${property.neighborhood}`, 14, 31);
    doc.text(`${property.city} - ${property.state}`, 14, 36);

    // Tabela 1: Rateio por Locatário
    doc.setFontSize(12);
    doc.setTextColor(196, 84, 27);
    doc.setFont('helvetica', 'bold');
    doc.text(`RATEIO POR LOCATÁRIO - ANO ${selectedYear}`, 14, 48);

    const rateioColumns = ['LOCATÁRIO', 'ÁREA', 'PERCENTUAL', 'VALOR RATEIO'];
    const rateioRows = yearTenants.map(t => {
      const isSingle = t.isSingleTenant;
      let percentage = isSingle ? 100 : (totalArea > 0 ? (t.occupiedArea / totalArea) * 100 : 0);
      if (t.manualPercentage !== undefined) percentage = t.manualPercentage;

      const apportionment = (percentage / 100) * yearTotalWithWaste;

      return [
        t.name.toUpperCase(),
        `${t.occupiedArea.toLocaleString('pt-BR')} m²`,
        `${percentage.toFixed(1)}%`,
        currencyFormatter.format(apportionment)
      ];
    });

    // Adiciona linha de total do rateio
    rateioRows.push([
      `TOTAL (${yearTenants.length} LOC.)`,
      `${totalArea.toLocaleString('pt-BR')} m²`,
      '100.0%',
      currencyFormatter.format(yearTotalWithWaste)
    ]);

    autoTable(doc, {
      head: [rateioColumns],
      body: rateioRows,
      startY: 52,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [196, 84, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      didParseCell: (data) => {
        if (data.row.index === rateioRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [255, 245, 240];
        }
      }
    });

    // Tabela 2: IPTU Detalhado
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setTextColor(196, 84, 27);
    doc.setFont('helvetica', 'bold');
    doc.text(`DETALHAMENTO IPTU - ANO ${selectedYear}`, 14, finalY);

    const iptuColumns = ['SEQUENCIAL', 'COTA ÚNICA', 'PARCELADO', 'TAXA LIXO', 'FORMA', 'STATUS'];
    const iptuRows = yearUnits.map(u => [
      u.sequential,
      currencyFormatter.format(u.singleValue),
      currencyFormatter.format(u.installmentValue),
      u.hasWasteTax ? currencyFormatter.format(u.wasteTaxValue || 0) : '---',
      u.chosenMethod.toUpperCase(),
      u.status.toUpperCase()
    ]);

    const totalSingleBase = yearUnits.reduce((acc, u) => acc + (Number(u.singleValue) || 0), 0);
    const totalInstallBase = yearUnits.reduce((acc, u) => acc + (Number(u.installmentValue) || 0), 0);
    const totalWaste = yearUnits.reduce((acc, u) => acc + (u.hasWasteTax ? (Number(u.wasteTaxValue) || 0) : 0), 0);

    iptuRows.push([
      'TOTAIS',
      currencyFormatter.format(totalSingleBase),
      currencyFormatter.format(totalInstallBase),
      currencyFormatter.format(totalWaste),
      '---',
      '---'
    ]);

    autoTable(doc, {
      head: [iptuColumns],
      body: iptuRows,
      startY: finalY + 4,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [196, 84, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      didParseCell: (data) => {
        if (data.row.index === iptuRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [255, 245, 240];
        }
      }
    });

    doc.save(`ESPELHO_${property.name.replace(/\s+/g, '_')}_${selectedYear}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="bg-white dark:bg-[#1a2634] w-full max-w-6xl max-h-[95vh] flex flex-col rounded-3xl shadow-2xl border border-gray-200 dark:border-[#2a3644] overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-8 py-5 border-b-2 border-primary bg-gray-50 dark:bg-[#1e2a3b]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-xl">apartment</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-[#111418] dark:text-white uppercase tracking-tight">{property.name}</h2>
                <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm ${currentYearStatus === IptuStatus.PAID ? 'bg-emerald-500 text-white' :
                  currentYearStatus === IptuStatus.OPEN ? 'bg-red-500 text-white' :
                    currentYearStatus === IptuStatus.LAUNCHED ? 'bg-indigo-500 text-white' :
                      currentYearStatus === IptuStatus.IN_ANALYSIS ? 'bg-amber-500 text-white' :
                        'bg-primary text-white'
                  }`}>{currentYearStatus}</span>
              </div>
              <p className="text-[10px] font-semibold text-primary/80 uppercase tracking-widest">Inscrição: #{property.registrationNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="size-10 flex items-center justify-center rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-95">
            <span className="material-symbols-outlined text-[#111418] dark:text-white font-bold text-xl">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar">
          {/* Seção Superior: Foto e Localização */}
          <section className="bg-gray-50/50 dark:bg-[#1a2634] p-6 rounded-3xl border border-gray-100 dark:border-[#2a3644] shadow-sm">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="w-full md:w-80 h-64 bg-gray-200 dark:bg-[#1e2a3b] rounded-2xl overflow-hidden shadow-lg flex-shrink-0 border-2 border-white dark:border-gray-700 relative group">
                {property.imageUrl ? (
                  <img src={property.imageUrl} alt={property.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-[#617289]">
                    <span className="material-symbols-outlined text-5xl mb-1">image_not_supported</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">SEM FOTO</span>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col lg:flex-row gap-8 items-center md:items-start">
                <div className="flex-1 space-y-5">
                  <div>
                    <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] font-bold">location_on</span> Localização
                    </h3>
                    <p className="text-2xl font-bold text-[#111418] dark:text-white leading-tight mb-2">
                      {property.address}
                    </p>
                    <p className="text-base font-semibold text-[#617289] dark:text-[#9ca3af]">
                      {property.neighborhood} • {property.city} - {property.state}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-[11px] font-semibold text-primary/70 uppercase tracking-widest">CEP: {property.zipCode}</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleGenerateMirror}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white hover:bg-primary/90 rounded-xl text-[9px] font-semibold transition-all shadow-md shadow-primary/20 uppercase active:scale-95 whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                          Gerar espelho
                        </button>
                        <button
                          onClick={() => onEditProperty(property)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-[9px] font-semibold transition-all shadow-sm uppercase active:scale-95 whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Editar
                        </button>
                        <button
                          onClick={() => onDeleteProperty(property.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl text-[9px] font-semibold transition-all shadow-sm uppercase active:scale-95 border border-red-100 dark:border-red-500/20 whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-3 py-1 bg-primary text-white text-[9px] font-bold rounded-lg uppercase shadow-sm">
                      {property.type}
                    </span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[9px] font-bold rounded-lg uppercase">
                      POSSE: {property.possession}
                    </span>
                  </div>
                </div>

                {/* Cards de Área (Topo Direito) */}
                <div className="flex flex-row lg:flex-col gap-4 w-full lg:w-48 shrink-0">
                  <div className="flex-1 bg-white dark:bg-[#1e2a3b] p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center gap-1 group hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 opacity-60">
                      <span className="material-symbols-outlined text-[18px] text-primary">straighten</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider">Área Terreno</span>
                    </div>
                    <span className="text-xl font-black text-[#111418] dark:text-white leading-none">
                      {property.landArea.toLocaleString('pt-BR')} <span className="text-[10px] font-bold text-gray-400 uppercase">m²</span>
                    </span>
                  </div>
                  <div className="flex-1 bg-white dark:bg-[#1e2a3b] p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center gap-1 group hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 opacity-60">
                      <span className="material-symbols-outlined text-[18px] text-primary">architecture</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider">Área Constr.</span>
                    </div>
                    <span className="text-xl font-black text-[#111418] dark:text-white leading-none">
                      {property.builtArea.toLocaleString('pt-BR')} <span className="text-[10px] font-bold text-gray-400 uppercase">m²</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dados do Imóvel: Compactado abaixo da localização */}
            <div className="mt-8 bg-white dark:bg-[#1e2a3b] p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
              <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700 pb-3">
                <span className="material-symbols-outlined text-[16px] font-bold">analytics</span> Dados do Imóvel
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 opacity-60">
                    <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#617289] dark:text-[#9ca3af]">Proprietário</span>
                  </div>
                  <span className="text-sm font-bold text-[#111418] dark:text-white truncate">{property.ownerName}</span>
                </div>
                <div className="lg:col-span-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 opacity-60">
                    <span className="material-symbols-outlined text-[16px] text-primary">domain</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#617289] dark:text-[#9ca3af]">Cadas. Imob.</span>
                  </div>
                  <span className="text-sm font-bold text-[#111418] dark:text-white truncate">{property.registryOwner}</span>
                </div>
                <div className="lg:col-span-2 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 opacity-60">
                    <span className="material-symbols-outlined text-[16px] text-primary">tag</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#617289] dark:text-[#9ca3af]">Inscrição</span>
                  </div>
                  <span className="text-sm font-bold text-[#111418] dark:text-white truncate">{property.registrationNumber}</span>
                </div>
                <div className="lg:col-span-4 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 opacity-60">
                    <span className="material-symbols-outlined text-[16px] text-primary">group</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#617289] dark:text-[#9ca3af]">Locatários ({selectedYear})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {property.tenants.filter(t => t.year === selectedYear).length > 0 ? (
                      property.tenants.filter(t => t.year === selectedYear).map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-[#111418] dark:text-white text-[10px] font-bold rounded-md border border-gray-200 dark:border-gray-700 shadow-sm">
                          {t.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm font-bold text-gray-400 dark:text-gray-500 italic">Disponível</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sequenciais em Complexos */}
              {property.isComplex && property.units && property.units.length > 0 && (
                <div className="mt-8 pt-5 border-t border-gray-50 dark:border-gray-700">
                  <h4 className="text-[9px] font-bold text-[#617289] dark:text-[#9ca3af] uppercase tracking-widest mb-3">Sequenciais Vinculados</h4>
                  <div className="flex flex-wrap gap-2">
                    {property.units
                      .filter(u => u.year === selectedYear)
                      .map((unit, idx) => (
                        <div key={idx} className="bg-primary/5 dark:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/10 flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-primary">#{idx + 1}</span>
                            <div className="flex flex-col">
                              <span className="text-xs font-mono font-bold text-[#111418] dark:text-white leading-none">{unit.sequential}</span>
                              {unit.registrationNumber && (
                                <span className="text-[8px] font-semibold text-primary/70 uppercase tracking-tighter">Insc: {unit.registrationNumber}</span>
                              )}
                            </div>
                          </div>
                          {unit.address && (
                            <span className="text-[10px] font-medium text-[#617289] dark:text-[#9ca3af] italic">{unit.address}</span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Seção 2: Rateio */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#111418] dark:text-white flex items-center gap-2 uppercase tracking-tight">
                <span className="material-symbols-outlined text-primary text-xl font-bold">group</span> {(() => {
                  const hasSingle = property.tenants.some(t => t.year === selectedYear && t.isSingleTenant);
                  return hasSingle ? 'Único Responsável' : 'Rateio por Locatário';
                })()}
              </h3>
              <div className="flex items-center gap-3">
                <div className="relative flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gray-100/80 dark:bg-[#1e2a3b] border border-transparent hover:border-primary/40 transition-all group overflow-hidden cursor-pointer shadow-sm">
                  <div className="flex items-center gap-1.5 pointer-events-none">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest select-none">Ano:</span>
                    <span className="text-sm font-bold text-[#111418] dark:text-white select-none">{selectedYear}</span>
                    <span className="material-symbols-outlined text-[16px] text-primary transition-transform group-hover:translate-y-0.5">expand_more</span>
                  </div>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    title="Selecionar Ano"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full appearance-none z-10"
                  >
                    {availableYears.map(y => <option key={y} value={y} className="dark:bg-[#1a2634]">{y}</option>)}
                  </select>
                </div>
                <button
                  onClick={() => onOpenIptuConfig(property, 'tenants', selectedYear)}
                  className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-[10px] font-bold transition-all shadow-sm uppercase active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Editar Rateio
                </button>
                <button
                  onClick={() => onOpenIptuConfig(property, 'tenants', selectedYear)}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-white hover:bg-primary/90 rounded-xl text-[10px] font-bold transition-all shadow-md uppercase active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Inserir Locatário
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a2634] border border-gray-100 dark:border-[#2a3644] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
              {(() => {
                const yearUnits = property.units.filter(u => u.year === selectedYear);
                const yearTenants = property.tenants.filter(t => t.year === selectedYear);
                const isManualMode = yearTenants.some(t => t.manualPercentage !== undefined);

                const totalArea = yearTenants.reduce((acc, t) => acc + (Number(t.occupiedArea) || 0), 0);
                const yearTotalWithWaste = yearUnits.reduce((acc, u) => {
                  const base = u.chosenMethod === 'Parcelado' ? (u.installmentValue || 0) : (u.singleValue || 0);
                  const waste = u.hasWasteTax ? (u.wasteTaxValue || 0) : 0;
                  return acc + base + waste;
                }, 0);

                return (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-[#1e2a3b] border-b-2 border-primary">
                      <tr>
                        <th className="px-6 py-4 text-[9px] font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest">Locatário / Empresa</th>
                        {!isManualMode && <th className="px-6 py-4 text-[9px] font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest">Área Ocupada</th>}
                        <th className="px-6 py-4 text-[9px] font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest">Percentual</th>
                        <th className="px-6 py-4 text-[9px] font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-center">Vigência</th>
                        <th className="px-6 py-4 text-[9px] font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-right">
                          {property.tenants.some(t => t.year === selectedYear && t.isSingleTenant) ? 'Valor' : 'Valor Rateio'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50 text-sm">
                      {yearTenants.length === 0 ? (
                        <tr>
                          <td colSpan={isManualMode ? 4 : 5} className="px-6 py-12 text-center text-[#617289] dark:text-[#9ca3af] font-semibold italic opacity-60">Nenhum locatário cadastrado para {selectedYear}.</td>
                        </tr>
                      ) : (
                        yearTenants.map((tenant) => {
                          const isSingle = tenant.isSingleTenant;
                          let percentage: number;
                          let apportionment: number;

                          if (isSingle) {
                            percentage = 100;
                            apportionment = yearTotalWithWaste;
                          } else if (isManualMode && tenant.manualPercentage !== undefined) {
                            percentage = tenant.manualPercentage;
                            apportionment = (tenant.manualPercentage / 100) * yearTotalWithWaste;
                          } else {
                            percentage = totalArea > 0 ? (tenant.occupiedArea / totalArea) * 100 : 0;
                            apportionment = totalArea > 0 ? (tenant.occupiedArea / totalArea) * yearTotalWithWaste : 0;
                          }

                          return (
                            <tr key={tenant.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group">
                              <td className="px-6 py-4 font-bold text-[#111418] dark:text-white uppercase group-hover:text-primary transition-colors">{tenant.name}</td>
                              {!isManualMode && <td className="px-6 py-4 font-semibold text-[#617289] dark:text-[#9ca3af]">{tenant.occupiedArea.toLocaleString('pt-BR')} m²</td>}
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[9px] font-bold tracking-widest">{percentage.toFixed(1)}%</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-[10px] font-semibold text-[#617289] dark:text-[#9ca3af]">
                                  {tenant.contractStart && tenant.contractEnd
                                    ? `${new Date(tenant.contractStart + 'T00:00:00').toLocaleDateString('pt-BR')} - ${new Date(tenant.contractEnd + 'T00:00:00').toLocaleDateString('pt-BR')}`
                                    : '---'}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold text-emerald-600 text-right">
                                {currencyFormatter.format(apportionment)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {yearTenants.length > 0 && (
                      <tfoot className="bg-gray-50 dark:bg-[#1e2a3b] border-t-2 border-primary">
                        <tr>
                          <td className="px-6 py-4 font-black text-[#111418] dark:text-white uppercase tracking-tighter text-xs">TOTAL ({yearTenants.length} LOC.)</td>
                          {!isManualMode && (
                            <td className="px-6 py-4 font-black text-[#111418] dark:text-white text-sm">
                              {totalArea.toLocaleString('pt-BR')} m²
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-primary text-white rounded-full text-[9px] font-bold tracking-widest">100.0%</span>
                          </td>
                          <td className="px-6 py-4"></td>
                          <td className="px-6 py-4 font-black text-emerald-600 text-right text-base">
                            {currencyFormatter.format(yearTotalWithWaste)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                );
              })()}
            </div>
          </section>

          {/* Seção 1: IPTU 2026 */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#111418] dark:text-white flex items-center gap-3 uppercase tracking-tight">
                <span className="material-symbols-outlined text-primary text-xl font-bold">event_available</span> IPTU {selectedYear}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenIptuConfig(property, 'newCharge', selectedYear)}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-[10px] font-bold transition-all shadow-md uppercase active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">history_edu</span>
                  Novo IPTU
                </button>
                <button
                  onClick={() => onOpenIptuConfig(property, 'units', selectedYear)}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-white hover:bg-primary/90 rounded-xl text-[10px] font-bold transition-all shadow-md uppercase active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Inserir Sequencial
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a2634] border border-gray-100 dark:border-[#2a3644] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-gray-50 dark:bg-[#1e2a3b] border-b-2 border-primary">
                  <tr>
                    <th className="px-6 py-3 font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-[9px]">Sequencial</th>
                    <th className="px-6 py-3 font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-[9px]">Cota Única</th>
                    <th className="px-6 py-3 font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-[9px]">Parcelado</th>
                    <th className="px-6 py-3 font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-[9px]">Taxa de Lixo</th>
                    <th className="px-6 py-3 font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-[9px]">Forma</th>
                    <th className="px-6 py-3 font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-[9px]">Status</th>
                    <th className="px-6 py-3 font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-[9px] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {property.units && property.units.filter(u => u.year === selectedYear).length > 0 ? (
                    [...property.units]
                      .filter(u => u.year === selectedYear)
                      .sort((a, b) => a.sequential.localeCompare(b.sequential))
                      .map((unit, idx) => (
                        <tr key={idx} className="hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-sm text-primary leading-none">{unit.sequential}</span>
                                {unit.registrationNumber && (
                                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight">Insc: {unit.registrationNumber}</span>
                                )}
                              </div>
                              {unit.address && (
                                <span className="text-[10px] font-medium text-[#617289] dark:text-[#9ca3af] italic">{unit.address}</span>
                              )}
                              <div className="flex gap-2">
                                {unit.landArea > 0 && (
                                  <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 rounded">T: {unit.landArea}m²</span>
                                )}
                                {unit.builtArea > 0 && (
                                  <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-1.5 rounded">C: {unit.builtArea}m²</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-emerald-600">{currencyFormatter.format(unit.singleValue)}</td>
                          <td className="px-6 py-4 font-semibold text-orange-600">
                            {currencyFormatter.format(unit.installmentValue)}
                            <div className="text-[9px] opacity-70 font-bold">
                              ({unit.installmentsCount}x de {currencyFormatter.format((unit.installmentValue || 0) / (unit.installmentsCount || 1))})
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {unit.hasWasteTax ? (
                              <span className="px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase bg-primary/10 text-primary">
                                {currencyFormatter.format(unit.wasteTaxValue || 0)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-300 font-bold uppercase">---</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase ${unit.chosenMethod === 'Cota Única' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                              }`}>
                              {unit.chosenMethod}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase ${unit.status === IptuStatus.PAID ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' :
                              unit.status === IptuStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' :
                                unit.status === IptuStatus.IN_ANALYSIS ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' :
                                  unit.status === IptuStatus.LAUNCHED ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' :
                                    unit.status === IptuStatus.PENDING ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300' :
                                      'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                              }`}>
                              {unit.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => onOpenIptuConfig(property, 'units', selectedYear, unit.sequential, unit.registrationNumber)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-primary hover:bg-primary/10 rounded-lg transition-all text-[9px] font-bold uppercase"
                                title="Editar Sequencial"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                Editar
                              </button>
                              <button
                                onClick={() => onDeleteUnit(property.id, unit.sequential, selectedYear, unit.registrationNumber)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 rounded-lg transition-all text-[9px] font-bold uppercase"
                                title="Excluir Sequencial"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-[#617289] dark:text-[#9ca3af] font-semibold italic text-xs uppercase opacity-40">Sem dados para 2026.</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-100 dark:bg-[#1e2a3b] border-t-2 border-primary">
                  {(() => {
                    const yearUnits = property.units.filter(u => u.year === selectedYear);
                    if (yearUnits.length === 0) return null;

                    // CÁLCULO DOS TOTAIS
                    // O total por método deve considerar o valor base (CU ou Parcelado) + a taxa de lixo
                    const totalByMethod = yearUnits.reduce((acc, u) => {
                      const base = u.chosenMethod === 'Parcelado' ? (Number(u.installmentValue) || 0) : (Number(u.singleValue) || 0);
                      const waste = u.hasWasteTax ? (Number(u.wasteTaxValue) || 0) : 0;
                      return acc + base + waste;
                    }, 0);

                    // Totais das colunas mostrarão apenas os valores base para bater com a soma visual
                    const totalSingleBase = yearUnits.reduce((acc, u) => acc + (Number(u.singleValue) || 0), 0);
                    const totalInstallBase = yearUnits.reduce((acc, u) => acc + (Number(u.installmentValue) || 0), 0);
                    const totalWaste = yearUnits.reduce((acc, u) => acc + (u.hasWasteTax ? (Number(u.wasteTaxValue) || 0) : 0), 0);

                    return (
                      <tr>
                        <td className="px-6 py-4 font-bold text-[#111418] dark:text-white uppercase text-xs">TOTAL ({yearUnits.length} SEQ.)</td>
                        <td className="px-6 py-4 font-bold text-emerald-600 text-sm">{currencyFormatter.format(totalSingleBase)}</td>
                        <td className="px-6 py-4 font-bold text-orange-600 text-sm">{currencyFormatter.format(totalInstallBase)}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-primary">{currencyFormatter.format(totalWaste)}</span>
                          </div>
                        </td>
                        <td colSpan={2} className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-bold text-gray-500">VALOR CONF. FORMA</span>
                            <span className="font-bold text-primary text-lg">{currencyFormatter.format(totalByMethod)}</span>
                          </div>
                        </td>
                        <td></td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </div>
          </section>

          {/* Seções de Histórico por Ano */}
          {(() => {
            const historyYears = new Set<number>();
            (property.units || []).forEach(u => {
              if (Number(u.year) < Number(selectedYear)) historyYears.add(Number(u.year));
            });
            (property.iptuHistory || []).forEach(h => {
              if (Number(h.year) < Number(selectedYear)) historyYears.add(Number(h.year));
            });

            const sortedYears = Array.from(historyYears).sort((a, b) => b - a);

            if (sortedYears.length === 0) {
              return (
                <section className="space-y-6">
                  <h3 className="text-lg font-bold text-[#111418] dark:text-white flex items-center gap-3 uppercase tracking-tight">
                    <span className="material-symbols-outlined text-primary text-xl font-bold">history</span> Histórico
                  </h3>
                  <div className="bg-white dark:bg-[#1a2634] border border-gray-100 dark:border-[#2a3644] rounded-2xl p-12 text-center text-[#617289] dark:text-[#9ca3af] font-semibold italic text-xs uppercase opacity-40">
                    Sem dados históricos anteriores a {selectedYear}.
                  </div>
                </section>
              );
            }

            return sortedYears.map(year => {
              const yearUnits = (property.units || []).filter(u => Number(u.year) === year);
              const hasUnits = yearUnits.length > 0;

              // Se houver unidades, mostramos apenas as unidades (prioridade do dado granular)
              // Se não houver, pegamos o registro do iptuHistory (histórico legado/consolidado)
              let displayItems = [];
              if (hasUnits) {
                displayItems = yearUnits.map(u => ({ ...u, type: 'unit' as const }))
                  .sort((a, b) => a.sequential.localeCompare(b.sequential));
              } else {
                const h = (property.iptuHistory || []).find(hist => Number(hist.year) === year);
                if (h) {
                  displayItems = [{
                    year: h.year,
                    sequential: 'Histórico Consolidado',
                    singleValue: h.value,
                    installmentValue: h.value,
                    status: h.status || IptuStatus.PENDING,
                    chosenMethod: 'Cota Única' as const,
                    type: 'history' as const,
                    id: h.id,
                    registrationNumber: ''
                  }];
                }
              }

              if (displayItems.length === 0) return null;

              return (
                <section key={year} className="space-y-6">
                  <h3 className="text-lg font-bold text-[#111418] dark:text-white flex items-center gap-3 uppercase tracking-tight">
                    <span className="material-symbols-outlined text-primary text-xl font-bold">history</span> Histórico {year}
                  </h3>

                  <div className="bg-white dark:bg-[#1a2634] border border-gray-100 dark:border-[#2a3644] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-gray-50 dark:bg-[#1e2a3b] border-b-2 border-primary">
                        <tr>
                          <th className="px-6 py-3 font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-[9px]">Sequencial</th>
                          <th className="px-6 py-3 font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-[9px]">Cota Única</th>
                          <th className="px-6 py-3 font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-[9px]">Parcelado</th>
                          <th className="px-6 py-3 font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-[9px]">Taxa de Lixo</th>
                          <th className="px-6 py-3 font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-[9px]">Forma</th>
                          <th className="px-6 py-3 font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-[9px]">Status</th>
                          <th className="px-6 py-3 font-bold uppercase text-[#617289] dark:text-[#9ca3af] tracking-widest text-[9px] text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {displayItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-col">
                                  <span className="font-mono font-bold text-sm text-primary leading-none">{item.sequential}</span>
                                  {item.registrationNumber && (
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight">Insc: {item.registrationNumber}</span>
                                  )}
                                </div>
                                {item.type === 'unit' && (item as any).address && (
                                  <span className="text-[10px] font-medium text-[#617289] dark:text-[#9ca3af] italic">{(item as any).address}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-emerald-600">{currencyFormatter.format(item.singleValue)}</td>
                            <td className="px-6 py-4 font-semibold text-orange-600">
                              {currencyFormatter.format(item.installmentValue)}
                            </td>
                            <td className="px-6 py-4">
                              {(item as any).hasWasteTax ? (
                                <span className="px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase bg-primary/10 text-primary">
                                  {currencyFormatter.format((item as any).wasteTaxValue || 0)}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-300 font-bold uppercase">---</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase ${item.chosenMethod === 'Cota Única' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' :
                                'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                                }`}>
                                {item.chosenMethod}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase ${String(item.status).toLowerCase() === 'pago' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' :
                                String(item.status).toLowerCase().includes('andamento') ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' :
                                  'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                                }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {item.type === 'unit' && (
                                  <button
                                    onClick={() => onOpenIptuConfig(property, 'units', Number(item.year), item.sequential, (item as any).registrationNumber)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-primary hover:bg-primary/10 rounded-lg transition-all text-[9px] font-bold uppercase"
                                    title="Editar Sequencial"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                    Editar
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (item.type === 'unit') {
                                      onDeleteUnit(property.id, item.sequential, Number(item.year), (item as any).registrationNumber);
                                    } else {
                                      onDeleteIptu(property.id, (item as any).id);
                                    }
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 rounded-lg transition-all text-[9px] font-bold uppercase"
                                  title="Excluir"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            });
          })()}

          {/* Analítica: Também ocupando toda a largura, abaixo do Histórico */}
          <section className="space-y-6 pt-4">
            <h3 className="text-lg font-bold text-[#111418] dark:text-white flex items-center gap-3 uppercase tracking-tight">
              <span className="material-symbols-outlined text-primary text-xl font-bold">query_stats</span> Análise Comparativa
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(() => {
                const currentUnits = property.units.filter(u => u.year === selectedYear);
                const prevUnits = property.units.filter(u => u.year === selectedYear - 1);
                const totalSingleCur = currentUnits.reduce((acc, u) => acc + (u.singleValue || 0), 0);
                const totalInstallCur = currentUnits.reduce((acc, u) => acc + (u.installmentValue || 0), 0);
                const totalSinglePrev = prevUnits.reduce((acc, u) => acc + (u.singleValue || 0), 0);
                const totalInstallPrev = prevUnits.reduce((acc, u) => acc + (u.installmentValue || 0), 0);

                // Card 1: Economia Cota Única vs Parcelado
                const econSingle = totalInstallCur - totalSingleCur;

                // Card 2: Cota Única Ano Anterior vs Ano Atual
                const diffSingle = totalSingleCur - totalSinglePrev;
                const varSingle = totalSinglePrev > 0 ? (diffSingle / totalSinglePrev) * 100 : 0;

                // Card 3: Parcelado Ano Anterior vs Ano Atual
                const diffInstall = totalInstallCur - totalInstallPrev;
                const varInstall = totalInstallPrev > 0 ? (diffInstall / totalInstallPrev) * 100 : 0;

                return (
                  <>
                    {/* Card 1: Cota Única vs Parcelado */}
                    <div className="bg-emerald-600 text-white p-6 rounded-2xl shadow-lg flex flex-col gap-2 relative overflow-hidden">
                      <span className="material-symbols-outlined absolute -bottom-2 -right-2 text-6xl opacity-10">savings</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Cota Única vs Parcelado</span>
                      <span className="text-2xl font-bold">{currencyFormatter.format(econSingle)}</span>
                      <span className="text-[9px] font-semibold bg-white/20 w-fit px-2 py-0.5 rounded-lg uppercase">Economia ao pagar à vista</span>
                    </div>

                    {/* Card 2: Cota Única Ano Anterior vs Ano Atual */}
                    <div className="bg-white dark:bg-[#1a2634] p-6 rounded-2xl border border-gray-100 dark:border-[#2a3644] shadow-sm flex flex-col gap-2 relative overflow-hidden">
                      <span className="material-symbols-outlined absolute -bottom-2 -right-2 text-6xl opacity-5">calendar_today</span>
                      <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Cota Única {selectedYear - 1} vs {selectedYear}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${totalSinglePrev > 0 ? (varSingle > 0 ? 'text-red-500' : 'text-emerald-500') : 'text-[#617289]'}`}>
                          {totalSinglePrev > 0 ? `${varSingle > 0 ? '+' : ''}${varSingle.toFixed(1)}%` : 'N/A'}
                        </span>
                        {totalSinglePrev > 0 && (
                          <span className={`material-symbols-outlined text-lg ${varSingle > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {varSingle > 0 ? 'trending_up' : 'trending_down'}
                          </span>
                        )}
                      </div>
                      {totalSinglePrev > 0 ? (
                        <span className={`text-xs font-semibold ${varSingle > 0 ? 'text-red-500/80' : 'text-emerald-500/80'}`}>
                          {varSingle > 0 ? '+' : ''}{currencyFormatter.format(diffSingle)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#617289] opacity-60">Sem dados do ano anterior</span>
                      )}
                    </div>

                    {/* Card 3: Parcelado Ano Anterior vs Ano Atual */}
                    <div className="bg-white dark:bg-[#1a2634] p-6 rounded-2xl border border-gray-100 dark:border-[#2a3644] shadow-sm flex flex-col gap-2 relative overflow-hidden">
                      <span className="material-symbols-outlined absolute -bottom-2 -right-2 text-6xl opacity-5">event_repeat</span>
                      <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Parcelado {selectedYear - 1} vs {selectedYear}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${totalInstallPrev > 0 ? (varInstall > 0 ? 'text-red-500' : 'text-emerald-500') : 'text-[#617289]'}`}>
                          {totalInstallPrev > 0 ? `${varInstall > 0 ? '+' : ''}${varInstall.toFixed(1)}%` : 'N/A'}
                        </span>
                        {totalInstallPrev > 0 && (
                          <span className={`material-symbols-outlined text-lg ${varInstall > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {varInstall > 0 ? 'trending_up' : 'trending_down'}
                          </span>
                        )}
                      </div>
                      {totalInstallPrev > 0 ? (
                        <span className={`text-xs font-semibold ${varInstall > 0 ? 'text-red-500/80' : 'text-emerald-500/80'}`}>
                          {varInstall > 0 ? '+' : ''}{currencyFormatter.format(diffInstall)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#617289] opacity-60">Sem dados do ano anterior</span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </section>
        </div>
      </div >

      {isAddIptuOpen && (
        <AddIptuModal
          property={property}
          initialData={iptuToEdit || undefined}
          onClose={() => { setIsAddIptuOpen(false); setIptuToEdit(null); }}
          onSubmit={(newIptu) => {
            onAddIptu(property.id, newIptu);
            setIsAddIptuOpen(false);
            setIptuToEdit(null);
          }}
        />
      )}

      {
        selectedIptuDetails && (
          <IptuDetailModal
            iptu={selectedIptuDetails}
            property={property}
            onClose={() => setSelectedIptuDetails(null)}
            onEdit={() => handleEditIptu(selectedIptuDetails)}
          />
        )
      }
    </div >
  );
};

export default PropertyDetailModal;
