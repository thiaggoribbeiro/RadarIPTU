
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo-report.png';
import { Property, IptuStatus } from '../types';
import { getPropertyStatus } from '../utils/iptu';
import MultiSelect from './MultiSelect';

interface ReportsViewProps {
  properties: Property[];
}

interface ReportSpec {
  id: string;
  category: 'Financeiro' | 'Operacional' | 'Gerencial' | 'Auditoria';
  title: string;
  description: string;
  icon: string;
  goal: string;
  columns: string[];
  metrics?: string[];
}

const reportSpecs: ReportSpec[] = [
  {
    id: 'fin_geral',
    category: 'Financeiro',
    title: 'Relatório Financeiro Geral',
    description: 'Consolidado de valores totais, pagos e saldos.',
    icon: 'account_balance_wallet',
    goal: 'Controle total da movimentação financeira anual.',
    columns: ['ID Imóvel', 'Nome', 'Inscrição', 'Ano', 'Valor Total', 'Valor Pago', 'Saldo Devedor', 'Status', 'Posse'],
    metrics: ['Total Provisionado', 'Total Arrecadado', 'Ticket Médio por Imóvel']
  },
  {
    id: 'aberto',
    category: 'Financeiro',
    title: 'Valores em Aberto',
    description: 'Listagem de débitos pendentes e vencimentos.',
    icon: 'pending',
    goal: 'Identificar inadimplência e fluxos de caixa futuros.',
    columns: ['Property', 'Due Date', 'Pending Value', 'Days Overdue', 'Owner', 'Posse'],
    metrics: ['Aging de Dívida', 'Total em Atraso > 30 dias']
  },
  {
    id: 'pagos',
    category: 'Financeiro',
    title: 'Pagamentos Efetuados',
    description: 'Histórico detalhado de quitações e métodos.',
    icon: 'payments',
    goal: 'Conciliação bancária e comprovação de pagamentos.',
    columns: ['Property', 'Date Paid', 'Value', 'Method', 'Receipt Reference', 'Posse'],
    metrics: ['Percentual Cota Única vs Parcelado']
  },
  {
    id: 'sit_imovel',
    category: 'Operacional',
    title: 'Situação por Imóvel',
    description: 'Raio-X individual de cada unidade da carteira.',
    icon: 'location_city',
    goal: 'Visão operacional rápida para gestores de condomínio/imobiliária.',
    columns: ['Property Name', 'Type', 'City', 'Last Update', 'Current Status', 'Posse'],
    metrics: ['Indicador de Regularização Individual']
  },
  {
    id: 'parcelamentos',
    category: 'Operacional',
    title: 'Relatório de Parcelamentos',
    description: 'Acompanhamento de acordos e parcelas vincendas.',
    icon: 'event_repeat',
    goal: 'Monitorar a evolução de pagamentos fracionados.',
    columns: ['Property', 'Total Installments', 'Current Installment', 'Next Due Date', 'Value', 'Posse'],
    metrics: ['Projeção de Recebimento Mensal']
  },
  {
    id: 'status_dist',
    category: 'Operacional',
    title: 'IPTUs por Status',
    description: 'Agrupamento por situação (Pago, Pendente, Atrasado).',
    icon: 'pie_chart',
    goal: 'Distribuição percentual da saúde da carteira.',
    columns: ['Status', 'Count of Properties', 'Sum of Value', 'Percentage'],
    metrics: ['Taxa de Conversão de Pendentes para Pagos']
  },
  {
    id: 'adimplencia',
    category: 'Gerencial',
    title: 'Adimplência da Carteira',
    description: 'Análise estratégica de conformidade financeira.',
    icon: 'verified',
    goal: 'KPIs de performance para diretoria e investidores.',
    columns: ['Month', 'Expected Collection', 'Actual Collection', 'Compliance Rate'],
    metrics: ['Métrica de Saúde Financeira (Total Pago / Total Devido)']
  },
  {
    id: 'comp_anual',
    category: 'Gerencial',
    title: 'Comparativo Anual',
    description: 'Evolução histórica de valores de IPTU.',
    icon: 'show_chart',
    goal: 'Identificar variações de mercado e aumentos tributários.',
    columns: ['Property', 'Value 2023', 'Value 2024', 'Variation (%)', 'Posse'],
    metrics: ['CAGR (Taxa de Crescimento Anual Composta)']
  },
  {
    id: 'impacto',
    category: 'Gerencial',
    title: 'Impacto Financeiro',
    description: 'Analise de multas, juros e descontos aplicados.',
    icon: 'trending_up',
    goal: 'Avaliar economia gerada por pagamentos em cota única.',
    columns: ['Property', 'Gross Value', 'Discount (Cota Única)', 'Final Value', 'Posse'],
    metrics: ['Economia Real Gerada (ROI)']
  },
  {
    id: 'auditoria',
    category: 'Auditoria',
    title: 'Lançamentos e Alterações',
    description: 'Log de modificações e trilha de auditoria.',
    icon: 'history_edu',
    goal: 'Garantir a integridade dos dados e rastrear erros.',
    columns: ['Timestamp', 'User', 'Property', 'Action', 'Previous Value', 'New Value'],
    metrics: ['Volume de Alterações Diárias']
  },
  {
    id: 'proj_anual',
    category: 'Gerencial',
    title: 'Projeção Anual',
    description: 'Relatório comparativo de IPTU com projeção de economia.',
    icon: 'analytics',
    goal: 'Analisar variações anuais e identificar economias via cota única.',
    columns: ['Proprietário', 'Inscrição', 'Sequencial', 'Endereço', 'Cota Única (Base)', 'Parcelado (Base)', 'Cota Única (Projeção)', 'Parcelado (Projeção)', 'Diferença Cota Única', 'Economia Projetada', '% Variação', 'Situação', 'Posse'],
    metrics: ['Variação Média da Carteira', 'Total de Economia Projetada']
  },
  {
    id: 'iptu_cidade',
    category: 'Financeiro',
    title: 'Valor de IPTU por Cidade',
    description: 'Soma total de IPTU por cidade em ordem decrescente.',
    icon: 'location_city',
    goal: 'Visualizar a concentração de valores por município.',
    columns: ['Cidade', 'Quantidade de Imóveis', 'Valor Total'],
  },
  {
    id: 'iptu_estado',
    category: 'Financeiro',
    title: 'Valor de IPTU por Estado',
    description: 'Soma total de IPTU por estado em ordem decrescente.',
    icon: 'map',
    goal: 'Análise de distribuição regional de IPTU.',
    columns: ['Estado', 'Quantidade de Imóveis', 'Valor Total'],
  },
  {
    id: 'rateio_detalhado',
    category: 'Gerencial',
    title: 'Relatório de Rateio Detalhado',
    description: 'Detalhamento de custos de IPTU por locatário.',
    icon: 'groups',
    goal: 'Visualizar a divisão exata de custos entre locatários por imóvel.',
    columns: ['Nome do Imóvel', 'Endereço', 'Inscrição/Sequencial', 'Locatário', 'Início Contrato', 'Fim Contrato', 'Área (m²)', 'Percentual', 'Valor Rateio', 'Posse'],
    metrics: ['Área Total Ocupada', 'Total Rateado', 'Média por Locatário']
  },
  {
    id: 'economia_cota_unica',
    category: 'Gerencial',
    title: 'Economia Cota Única',
    description: 'Análise de economia real ao optar pelo pagamento em cota única.',
    icon: 'savings',
    goal: 'Identificar as maiores oportunidades de economia na carteira.',
    columns: ['Proprietário', 'Inscrição', 'Sequencial', 'Endereço', 'Valor Parcelado', 'Valor Cota Única', 'Economia Real', '% Economia', 'Situação', 'Posse'],
    metrics: ['Economia Total Potencial', 'Média de Economia por Imóvel']
  },
  {
    id: 'iptu_vencimentos',
    category: 'Financeiro',
    title: 'Relatório de Vencimentos',
    description: 'Cronograma detalhado de datas de vencimento de IPTU.',
    icon: 'calendar_month',
    goal: 'Acompanhamento do calendário de pagamentos e fluxos de caixa.',
    columns: ['Imóvel', 'Cidade', 'UF', 'Inscrição', 'Sequencial', 'Ano', 'Vencimento', 'Valor', 'Status', 'Proprietário', 'Posse'],
    metrics: ['Total Vincendo (Próximos 30 dias)', 'Volume de Pagamentos por Mês']
  }
];

const ReportsView: React.FC<ReportsViewProps> = ({ properties }) => {
  const [selectedReport, setSelectedReport] = useState<ReportSpec>(reportSpecs[0]);
  const [isExporting, setIsExporting] = useState(false);

  // Colunas selecionadas para o relatório atual
  const [selectedColumns, setSelectedColumns] = useState<string[]>(reportSpecs[0].columns);

  // Sincroniza colunas selecionadas quando muda de relatório
  React.useEffect(() => {
    setSelectedColumns(selectedReport.columns);
  }, [selectedReport]);

  const toggleColumn = (column: string) => {
    setSelectedColumns(prev => {
      if (prev.includes(column)) {
        if (prev.length === 1) return prev; // Evita desmarcar todas as colunas
        return prev.filter(c => c !== column);
      }
      return [...prev, column];
    });
  };

  // Filtros
  const [filterCity, setFilterCity] = useState<string[]>([]);
  const [filterUF, setFilterUF] = useState<string[]>([]);
  const [filterOwner, setFilterOwner] = useState<string[]>([]);
  const [filterTenant, setFilterTenant] = useState<string[]>([]);
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string[]>([]);
  const [filterPossession, setFilterPossession] = useState<string[]>([]);
  const [filterOccupancy, setFilterOccupancy] = useState<string[]>([]);

  const [filterYear, setFilterYear] = useState<number>(2026); // Ano para filtros gerais
  const [baseYear, setBaseYear] = useState<number>(2025);
  const [compareYear, setCompareYear] = useState<number>(2026);
  const [projAnualStatusFilter, setProjAnualStatusFilter] = useState<string>('TODOS');
  const [filterMinSavings, setFilterMinSavings] = useState<number>(0);
  const [exportFormat, setExportFormat] = useState<'XLSX' | 'PDF'>('XLSX');

  const availableCities = useMemo(() => {
    const filtered = filterUF.length === 0
      ? properties
      : properties.filter(p => filterUF.includes(p.state));
    const cities = filtered.map(p => p.city).filter(Boolean) as string[];
    return Array.from(new Set(cities)).sort();
  }, [properties, filterUF]);

  const availableUFs = useMemo(() => {
    const filtered = filterCity.length === 0
      ? properties
      : properties.filter(p => filterCity.includes(p.city));
    const states = filtered.map(p => p.state).filter(Boolean) as string[];
    return Array.from(new Set(states)).sort();
  }, [properties, filterCity]);

  const availableOwners = useMemo(() => {
    const owners = properties.map(p => p.ownerName?.trim()).filter(Boolean) as string[];
    return Array.from(new Set(owners)).sort();
  }, [properties]);

  const availableTenants = useMemo(() => {
    const tenantsSet = new Set<string>();
    properties.forEach(p => {
      p.tenants?.forEach(t => {
        if (t.name) tenantsSet.add(t.name.trim());
      });
    });
    return Array.from(tenantsSet).sort();
  }, [properties]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    properties.forEach(p => {
      p.iptuHistory.forEach(h => yearsSet.add(h.year));
      p.units.forEach(u => yearsSet.add(u.year));
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [properties]);

  const handleExport = () => {
    setIsExporting(true);

    try {
      let exportData: any[] = [];
      const filename = `${selectedReport.title}.${exportFormat.toLowerCase()}`;
      const titleText = selectedReport.id === 'proj_anual'
        ? `${selectedReport.title} ${baseYear} x ${compareYear}`
        : selectedReport.title;

      switch (selectedReport.id) {
        case 'rateio_detalhado': {
          const filteredProps = properties.filter(p => {
            const matchesCity = filterCity.length === 0 || filterCity.includes(p.city);
            const matchesUF = filterUF.length === 0 || filterUF.includes(p.state);
            const matchesOwner = filterOwner.length === 0 || filterOwner.includes(p.ownerName?.trim());
            const matchesTenant = filterTenant.length === 0 || p.tenants?.some(t => filterTenant.includes(t.name?.trim()));
            const matchesPossession = filterPossession.length === 0 || filterPossession.includes(p.possession);

            // Filtro específico de rateio
            const hasTenantsThisYear = p.tenants?.some(t => t.year === filterYear);

            return p.isComplex && hasTenantsThisYear && matchesCity && matchesUF && matchesOwner && matchesTenant && matchesPossession;
          });

          exportData = filteredProps.flatMap(prop => {
            const yearUnits = prop.units.filter(u => u.year === filterYear);
            const yearTenants = prop.tenants.filter(t => t.year === filterYear);

            // Total do imóvel (mesma lógica do IptuConfigModal)
            const totalIptuValue = yearUnits.reduce((acc, unit) => {
              const baseValue = unit.chosenMethod === 'Parcelado' ? (Number(unit.installmentValue) || 0) : (Number(unit.singleValue) || 0);
              const wasteValue = unit.hasWasteTax ? (Number(unit.wasteTaxValue) || 0) : 0;
              return acc + baseValue + wasteValue;
            }, 0);

            const totalArea = yearTenants.reduce((acc, t) => acc + (Number(t.occupiedArea) || 0), 0);
            const singleTenant = yearTenants.find(t => t.isSingleTenant);
            const isManual = yearTenants.some(t => t.manualPercentage && t.manualPercentage > 0);

            // Sequenciais/Inscrições agrupados
            const seqInfo = yearUnits.length > 0
              ? [...new Set(yearUnits.map(u => u.sequential || u.registrationNumber))].join(', ')
              : prop.sequential || prop.registrationNumber;

            const tenantRows = yearTenants.map(tenant => {
              let percentage = 0;
              if (singleTenant) {
                percentage = tenant.id === singleTenant.id ? 100 : 0;
              } else if (isManual) {
                percentage = Number(tenant.manualPercentage) || 0;
              } else {
                percentage = totalArea > 0 ? (tenant.occupiedArea / totalArea) * 100 : 0;
              }

              const apportionmentValue = (percentage / 100) * totalIptuValue;

              return {
                'Nome do Imóvel': prop.name,
                'Endereço': prop.address,
                'Inscrição/Sequencial': seqInfo,
                'Locatário': tenant.name,
                'Início Contrato': tenant.contractStart || '---',
                'Fim Contrato': tenant.contractEnd || '---',
                'Área (m²)': tenant.occupiedArea || 0,
                'Percentual': `${percentage.toFixed(1)}%`,
                'Valor Rateio': apportionmentValue,
                'Posse': prop.possession
              };
            });

            // Adicionar linha de total por imóvel
            const propTotalValue = tenantRows.reduce((acc, row) => acc + (row['Valor Rateio'] || 0), 0);
            const propTotalArea = tenantRows.reduce((acc, row) => acc + (row['Área (m²)'] || 0), 0);

            const propertyTotalRow = {
              'Nome do Imóvel': prop.name, // Mantido para agrupamento no PDF, mas limpo no XLSX se necessário
              'Endereço': 'TOTAL',
              'Inscrição/Sequencial': '-',
              'Locatário': '-',
              'Início Contrato': '-',
              'Fim Contrato': '-',
              'Área (m²)': propTotalArea,
              'Percentual': '100.0%',
              'Valor Rateio': propTotalValue,
              'Posse': prop.possession,
              isTotal: true // Flag auxiliar
            };

            return [...tenantRows, propertyTotalRow];
          });

          // Removido total global conforme solicitado
          break;
        }

        case 'proj_anual': {
          let filteredProps = properties.filter(p => {
            const matchesCity = filterCity.length === 0 || filterCity.includes(p.city);
            const matchesUF = filterUF.length === 0 || filterUF.includes(p.state);
            const matchesOwner = filterOwner.length === 0 || filterOwner.includes(p.ownerName?.trim());
            const matchesTenant = filterTenant.length === 0 || p.tenants?.some(t => filterTenant.includes(t.name?.trim()));
            const matchesPossession = filterPossession.length === 0 || filterPossession.includes(p.possession);

            const propertyStatus = getPropertyStatus(p, compareYear);
            const matchesProjStatus = projAnualStatusFilter === 'TODOS' || propertyStatus === projAnualStatusFilter;

            const isOccupied = p.tenants?.some(t => t.year === compareYear);
            const occupancyStatus = isOccupied ? 'Locado' : 'Disponível';
            const matchesOccupancy = filterOccupancy.length === 0 || filterOccupancy.includes(occupancyStatus);

            return matchesCity && matchesUF && matchesOwner && matchesTenant && matchesPossession && matchesProjStatus && matchesOccupancy;
          });

          exportData = filteredProps.map(prop => {
            const unitsBase = prop.units.filter(u => u.year === baseYear);
            const unitsCompare = prop.units.filter(u => u.year === compareYear);

            // Soma valores de todas as unidades do imóvel para o ano base
            const cotaUnicaBase = unitsBase.reduce((acc, u) => acc + (Number(u.singleValue) || 0), 0);
            const parceladoBase = unitsBase.reduce((acc, u) => acc + (Number(u.installmentValue) || 0), 0);

            // Soma valores de todas as unidades do imóvel para o ano de comparação
            const cotaUnicaComp = unitsCompare.reduce((acc, u) => acc + (Number(u.singleValue) || 0), 0);
            const parceladoComp = unitsCompare.reduce((acc, u) => acc + (Number(u.installmentValue) || 0), 0);

            const diferenca = cotaUnicaComp - cotaUnicaBase;
            const economia = parceladoComp - cotaUnicaComp;
            const variacao = cotaUnicaBase > 0 ? (diferenca / cotaUnicaBase) * 100 : 0;

            // Consolidação de labels (Inscrição e Sequencial)
            const allRegistrations = Array.from(new Set([
              ...unitsBase.map(u => u.registrationNumber),
              ...unitsCompare.map(u => u.registrationNumber),
              prop.registrationNumber
            ].filter(Boolean)));

            const allSequentials = Array.from(new Set([
              ...unitsBase.map(u => u.sequential),
              ...unitsCompare.map(u => u.sequential),
              prop.sequential
            ].filter(Boolean)));

            const registrationDisplay = allRegistrations.join(', ') || '-';
            const sequentialDisplay = allSequentials.join(', ') || '-';

            // Situação: lista locatários do ano de comparação
            const tenants = prop.tenants.filter(t => t.year === compareYear);
            const situacao = tenants.length > 0
              ? Array.from(new Set(tenants.map(t => t.name))).join(', ')
              : 'DISPONÍVEL';

            return {
              'Proprietário': prop.ownerName || 'N/A',
              'Inscrição': registrationDisplay,
              'Sequencial': sequentialDisplay,
              'Endereço': prop.address,
              [`Cota Única (${baseYear})`]: cotaUnicaBase,
              [`Parcelado (${baseYear})`]: parceladoBase,
              [`Cota Única (${compareYear})`]: cotaUnicaComp,
              [`Parcelado (${compareYear})`]: parceladoComp,
              'Diferença Cota Única': diferenca,
              'Economia Projetada': economia,
              '% Variação': `${variacao.toFixed(2)}%`,
              'Situação': situacao,
              'Posse': prop.possession
            };
          });

          if (exportData.length > 0) {
            const totals = exportData.reduce((acc, row) => {
              acc.cotaBase += row[`Cota Única (${baseYear})`] || 0;
              acc.parceladoBase += row[`Parcelado (${baseYear})`] || 0;
              acc.cotaComp += row[`Cota Única (${compareYear})`] || 0;
              acc.parceladoComp += row[`Parcelado (${compareYear})`] || 0;
              acc.diferenca += row['Diferença Cota Única'] || 0;
              acc.economia += row['Economia Projetada'] || 0;
              return acc;
            }, { cotaBase: 0, parceladoBase: 0, cotaComp: 0, parceladoComp: 0, diferenca: 0, economia: 0 });

            const variacaoTotal = totals.cotaBase > 0 ? (totals.diferenca / totals.cotaBase) * 100 : 0;

            exportData.push({
              'Proprietário': 'TOTAIS',
              'Inscrição': '-',
              'Sequencial': '-',
              'Endereço': '-',
              [`Cota Única (${baseYear})`]: totals.cotaBase,
              [`Parcelado (${baseYear})`]: totals.parceladoBase,
              [`Cota Única (${compareYear})`]: totals.cotaComp,
              [`Parcelado (${compareYear})`]: totals.parceladoComp,
              'Diferença Cota Única': totals.diferenca,
              'Economia Projetada': totals.economia,
              '% Variação': `${variacaoTotal.toFixed(2)}%`,
              'Situação': '-'
            });
          }
          break;
        }

        case 'economia_cota_unica': {
          const filteredProps = properties.filter(p => {
            const matchesCity = filterCity.length === 0 || filterCity.includes(p.city);
            const matchesUF = filterUF.length === 0 || filterUF.includes(p.state);
            const matchesOwner = filterOwner.length === 0 || filterOwner.includes(p.ownerName?.trim());
            const matchesTenant = filterTenant.length === 0 || p.tenants?.some(t => filterTenant.includes(t.name?.trim()));
            const matchesPossession = filterPossession.length === 0 || filterPossession.includes(p.possession);

            const status = getPropertyStatus(p, filterYear);
            const matchesStatus = filterPaymentStatus.length === 0 || filterPaymentStatus.includes(status);

            const isOccupied = p.tenants?.some(t => t.year === filterYear);
            const occupancyStatus = isOccupied ? 'Locado' : 'Disponível';
            const matchesOccupancy = filterOccupancy.length === 0 || filterOccupancy.includes(occupancyStatus);

            return matchesCity && matchesUF && matchesOwner && matchesTenant && matchesPossession && matchesStatus && matchesOccupancy;
          });

          exportData = filteredProps.map(prop => {
            const yearUnits = prop.units.filter(u => u.year === filterYear);

            const parcelado = yearUnits.reduce((acc, u) => {
              const base = Number(u.installmentValue) || 0;
              const waste = u.hasWasteTax ? (Number(u.wasteTaxValue) || 0) : 0;
              return acc + base + waste;
            }, 0);

            const cotaUnica = yearUnits.reduce((acc, u) => {
              const base = Number(u.singleValue) || 0;
              const waste = u.hasWasteTax ? (Number(u.wasteTaxValue) || 0) : 0;
              return acc + base + waste;
            }, 0);

            const economia = parcelado - cotaUnica;
            const percEconomia = parcelado > 0 ? (economia / parcelado) * 100 : 0;

            const allRegistrations = Array.from(new Set([
              ...yearUnits.map(u => u.registrationNumber),
              prop.registrationNumber
            ].filter(Boolean)));

            const allSequentials = Array.from(new Set([
              ...yearUnits.map(u => u.sequential),
              prop.sequential
            ].filter(Boolean)));

            const registrationDisplay = allRegistrations.join(', ') || '-';
            const sequentialDisplay = allSequentials.join(', ') || '-';

            const tenants = prop.tenants.filter(t => t.year === filterYear);
            const situacao = tenants.length > 0
              ? Array.from(new Set(tenants.map(t => t.name))).join(', ')
              : 'DISPONÍVEL';

            return {
              'Proprietário': prop.ownerName || 'N/A',
              'Inscrição': registrationDisplay,
              'Sequencial': sequentialDisplay,
              'Endereço': prop.address,
              'Valor Parcelado': parcelado,
              'Valor Cota Única': cotaUnica,
              'Economia Real': economia,
              '% Economia': `${percEconomia.toFixed(2)}%`,
              'Situação': situacao,
              'Posse': prop.possession,
              _economiaValor: Number(economia.toFixed(2)) // Forçar precisão numérica para o filtro
            };
          }).filter(row => row._economiaValor >= filterMinSavings);

          if (exportData.length > 0) {
            const totals = exportData.reduce((acc, row) => {
              acc.parcelado += row['Valor Parcelado'] || 0;
              acc.cotaUnica += row['Valor Cota Única'] || 0;
              acc.economia += row['Economia Real'] || 0;
              return acc;
            }, { parcelado: 0, cotaUnica: 0, economia: 0 });

            exportData.push({
              'Proprietário': 'TOTAIS',
              'Inscrição': '-',
              'Sequencial': '-',
              'Endereço': '-',
              'Valor Parcelado': totals.parcelado,
              'Valor Cota Única': totals.cotaUnica,
              'Economia Real': totals.economia,
              '% Economia': totals.parcelado > 0 ? `${((totals.economia / totals.parcelado) * 100).toFixed(2)}%` : '0.00%',
              'Situação': '-',
              'Posse': '-'
            });
          }
          break;
        }

        case 'fin_geral': {
          const filteredProps = properties.filter(p => {
            const matchesCity = filterCity.length === 0 || filterCity.includes(p.city);
            const matchesUF = filterUF.length === 0 || filterUF.includes(p.state);
            const matchesOwner = filterOwner.length === 0 || filterOwner.includes(p.ownerName?.trim());
            const matchesTenant = filterTenant.length === 0 || p.tenants?.some(t => filterTenant.includes(t.name?.trim()));
            const matchesPossession = filterPossession.length === 0 || filterPossession.includes(p.possession);

            const status = getPropertyStatus(p, filterYear);
            const matchesStatus = filterPaymentStatus.length === 0 || filterPaymentStatus.includes(status);

            const isOccupied = p.tenants?.some(t => t.year === filterYear);
            const occupancyStatus = isOccupied ? 'Locado' : 'Disponível';
            const matchesOccupancy = filterOccupancy.length === 0 || filterOccupancy.includes(occupancyStatus);

            return matchesCity && matchesUF && matchesOwner && matchesTenant && matchesPossession && matchesStatus && matchesOccupancy;
          });
          exportData = filteredProps.flatMap(prop =>
            prop.iptuHistory
              .filter(iptu => iptu.year === filterYear)
              .map(iptu => ({
                'ID Imóvel': prop.id.substring(0, 8),
                'Nome': prop.name,
                'Inscrição': prop.registrationNumber,
                'Ano': iptu.year,
                'Valor Total': iptu.value,
                'Valor Pago': iptu.status === IptuStatus.PAID ? iptu.value : 0,
                'Saldo Devedor': (iptu.status === IptuStatus.PENDING || iptu.status === IptuStatus.OPEN) ? iptu.value : 0,
                'Status': iptu.status,
                'Posse': prop.possession
              }))
          );
          break;
        }

        case 'aberto': {
          const filteredProps = properties.filter(p => {
            const matchesCity = filterCity.length === 0 || filterCity.includes(p.city);
            const matchesUF = filterUF.length === 0 || filterUF.includes(p.state);
            const matchesOwner = filterOwner.length === 0 || filterOwner.includes(p.ownerName?.trim());
            const matchesTenant = filterTenant.length === 0 || p.tenants?.some(t => filterTenant.includes(t.name?.trim()));
            const matchesPossession = filterPossession.length === 0 || filterPossession.includes(p.possession);

            const isOccupied = p.tenants?.some(t => t.year === filterYear);
            const occupancyStatus = isOccupied ? 'Locado' : 'Disponível';
            const matchesOccupancy = filterOccupancy.length === 0 || filterOccupancy.includes(occupancyStatus);

            return matchesCity && matchesUF && matchesOwner && matchesTenant && matchesPossession && matchesOccupancy;
          });
          exportData = filteredProps.flatMap(prop =>
            prop.iptuHistory
              .filter(iptu => iptu.year === filterYear && (iptu.status === IptuStatus.PENDING || iptu.status === IptuStatus.OPEN))
              .map(iptu => {
                const dueDate = iptu.dueDate ? new Date(iptu.dueDate) : null;
                const today = new Date();
                const diffDays = dueDate ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24)) : 0;

                return {
                  'Property': prop.name,
                  'Due Date': iptu.dueDate || 'Pendente',
                  'Pending Value': iptu.value,
                  'Days Overdue': diffDays > 0 ? diffDays : 0,
                  'Owner': prop.ownerName,
                  'Posse': prop.possession
                };
              })
          );
          break;
        }

        case 'pagos': {
          const filteredProps = properties.filter(p => {
            const matchesCity = filterCity.length === 0 || filterCity.includes(p.city);
            const matchesUF = filterUF.length === 0 || filterUF.includes(p.state);
            const matchesOwner = filterOwner.length === 0 || filterOwner.includes(p.ownerName?.trim());
            const matchesTenant = filterTenant.length === 0 || p.tenants?.some(t => filterTenant.includes(t.name?.trim()));
            const matchesPossession = filterPossession.length === 0 || filterPossession.includes(p.possession);

            const isOccupied = p.tenants?.some(t => t.year === filterYear);
            const occupancyStatus = isOccupied ? 'Locado' : 'Disponível';
            const matchesOccupancy = filterOccupancy.length === 0 || filterOccupancy.includes(occupancyStatus);

            return matchesCity && matchesUF && matchesOwner && matchesTenant && matchesPossession && matchesOccupancy;
          });
          exportData = filteredProps.flatMap(prop =>
            prop.iptuHistory
              .filter(iptu => iptu.year === filterYear && iptu.status === IptuStatus.PAID)
              .map(iptu => ({
                'Property': prop.name,
                'Date Paid': iptu.startDate || 'N/A',
                'Value': iptu.value,
                'Method': iptu.chosenMethod || 'N/A',
                'Receipt Reference': iptu.receiptUrl ? 'Anexo' : 'N/A',
                'Posse': prop.possession
              }))
          );
          break;
        }

        case 'sit_imovel': {
          const filteredProps = properties.filter(p => {
            const matchesCity = filterCity.length === 0 || filterCity.includes(p.city);
            const matchesUF = filterUF.length === 0 || filterUF.includes(p.state);
            const matchesOwner = filterOwner.length === 0 || filterOwner.includes(p.ownerName?.trim());
            const matchesTenant = filterTenant.length === 0 || p.tenants?.some(t => filterTenant.includes(t.name?.trim()));
            const matchesPossession = filterPossession.length === 0 || filterPossession.includes(p.possession);

            const status = getPropertyStatus(p, filterYear);
            const matchesStatus = filterPaymentStatus.length === 0 || filterPaymentStatus.includes(status);

            const isOccupied = p.tenants?.some(t => t.year === filterYear);
            const occupancyStatus = isOccupied ? 'Locado' : 'Disponível';
            const matchesOccupancy = filterOccupancy.length === 0 || filterOccupancy.includes(occupancyStatus);

            return matchesCity && matchesUF && matchesOwner && matchesTenant && matchesPossession && matchesStatus && matchesOccupancy;
          });
          exportData = filteredProps.map(p => {
            const yearHistory = p.iptuHistory.find(h => h.year === filterYear);
            return {
              'Property Name': p.name,
              'Type': p.type,
              'City': p.city,
              'Last Update': p.lastUpdated,
              'Current Status': yearHistory?.status || 'N/A',
              'Posse': p.possession
            };
          });
          break;
        }

        case 'status_dist': {
          const filteredProps = properties.filter(p => {
            const matchesCity = filterCity.length === 0 || filterCity.includes(p.city);
            const matchesUF = filterUF.length === 0 || filterUF.includes(p.state);
            const matchesOwner = filterOwner.length === 0 || filterOwner.includes(p.ownerName?.trim());
            const matchesTenant = filterTenant.length === 0 || p.tenants?.some(t => filterTenant.includes(t.name?.trim()));
            const matchesPossession = filterPossession.length === 0 || filterPossession.includes(p.possession);

            return matchesCity && matchesUF && matchesOwner && matchesTenant && matchesPossession;
          });
          const stats = filteredProps.reduce((acc: any, prop) => {
            const yearHistory = prop.iptuHistory.find(h => h.year === filterYear);
            const status = yearHistory?.status || 'Pendente';
            const value = yearHistory?.value || 0;

            if (!acc[status]) acc[status] = { count: 0, sum: 0 };
            acc[status].count += 1;
            acc[status].sum += value;
            return acc;
          }, {});

          const total = filteredProps.length;
          exportData = Object.entries(stats).map(([status, data]: [string, any]) => ({
            'Status': status,
            'Count of Properties': data.count,
            'Sum of Value': data.sum,
            'Percentage': `${((data.count / total) * 100).toFixed(1)}%`
          }));
          break;
        }

        case 'iptu_cidade': {
          const cityMap: Record<string, { count: number, total: number }> = {};
          properties.forEach(p => {
            const yearHistory = p.iptuHistory.find(h => h.year === filterYear);
            if (yearHistory) {
              const city = p.city || 'N/A';
              if (!cityMap[city]) cityMap[city] = { count: 0, total: 0 };
              cityMap[city].count++;
              cityMap[city].total += yearHistory.value;
            }
          });

          exportData = Object.entries(cityMap)
            .map(([city, data]) => ({
              'Cidade': city,
              'Quantidade de Imóveis': data.count,
              'Valor Total': data.total
            }))
            .sort((a, b) => b['Valor Total'] - a['Valor Total']);
          break;
        }

        case 'iptu_estado': {
          const stateMap: Record<string, { count: number, total: number }> = {};
          properties.forEach(p => {
            const yearHistory = p.iptuHistory.find(h => h.year === filterYear);
            if (yearHistory) {
              const state = p.state || 'N/A';
              if (!stateMap[state]) stateMap[state] = { count: 0, total: 0 };
              stateMap[state].count++;
              stateMap[state].total += yearHistory.value;
            }
          });

          exportData = Object.entries(stateMap)
            .map(([state, data]) => ({
              'Estado': state,
              'Quantidade de Imóveis': data.count,
              'Valor Total': data.total
            }))
            .sort((a, b) => b['Valor Total'] - a['Valor Total']);
          break;
        }

        case 'iptu_vencimentos': {
          const filteredProps = properties.filter(p => {
            const matchesCity = filterCity.length === 0 || filterCity.includes(p.city);
            const matchesUF = filterUF.length === 0 || filterUF.includes(p.state);
            const matchesOwner = filterOwner.length === 0 || filterOwner.includes(p.ownerName?.trim());
            const matchesTenant = filterTenant.length === 0 || p.tenants?.some(t => filterTenant.includes(t.name?.trim()));
            const matchesPossession = filterPossession.length === 0 || filterPossession.includes(p.possession);

            const status = getPropertyStatus(p, filterYear);
            const matchesStatus = filterPaymentStatus.length === 0 || filterPaymentStatus.includes(status);

            const isOccupied = p.tenants?.some(t => t.year === filterYear);
            const occupancyStatus = isOccupied ? 'Locado' : 'Disponível';
            const matchesOccupancy = filterOccupancy.length === 0 || filterOccupancy.includes(occupancyStatus);

            return matchesCity && matchesUF && matchesOwner && matchesTenant && matchesPossession && matchesStatus && matchesOccupancy;
          });

          exportData = filteredProps.flatMap(prop => {
            const yearUnits = prop.units.filter(u => u.year === filterYear);

            return yearUnits.map(unit => ({
              'Imóvel': prop.name,
              'Cidade': prop.city,
              'UF': prop.state,
              'Inscrição': unit.registrationNumber || prop.registrationNumber,
              'Sequencial': unit.sequential || prop.sequential,
              'Ano': unit.year,
              'Vencimento': unit.dueDate ? new Date(unit.dueDate).toLocaleDateString('pt-BR') : 'N/A',
              'Valor': unit.chosenMethod === 'Parcelado' ? unit.installmentValue : unit.singleValue,
              'Status': unit.status,
              'Proprietário': prop.ownerName,
              'Posse': prop.possession,
              _month: unit.dueDate ? new Date(unit.dueDate).getMonth() : 12
            }));
          }).sort((a, b) => {
            if (a.Vencimento === 'N/A') return 1;
            if (b.Vencimento === 'N/A') return -1;
            const [dA, mA, yA] = a.Vencimento.split('/').map(Number);
            const [dB, mB, yB] = b.Vencimento.split('/').map(Number);
            return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
          });

          if (exportData.length > 0) {
            const totalValue = exportData.reduce((acc, row) => acc + (Number(row.Valor) || 0), 0);
            exportData.push({
              'Imóvel': 'TOTAIS',
              'Cidade': '-',
              'UF': '-',
              'Inscrição': '-',
              'Sequencial': '-',
              'Ano': '-',
              'Vencimento': '-',
              'Valor': totalValue,
              'Status': '-',
              'Proprietário': '-',
              'Posse': '-'
            });
          }
          break;
        }

        default: {
          // Export geral para qualquer outro tipo não mapeado especificamente
          const filteredProps = properties.filter(p => {
            const matchesCity = filterCity.length === 0 || filterCity.includes(p.city);
            const matchesUF = filterUF.length === 0 || filterUF.includes(p.state);
            const matchesOwner = filterOwner.length === 0 || filterOwner.includes(p.ownerName?.trim());
            const matchesTenant = filterTenant.length === 0 || p.tenants?.some(t => filterTenant.includes(t.name?.trim()));
            const matchesPossession = filterPossession.length === 0 || filterPossession.includes(p.possession);

            const status = getPropertyStatus(p, filterYear);
            const matchesStatus = filterPaymentStatus.length === 0 || filterPaymentStatus.includes(status);

            return matchesCity && matchesUF && matchesOwner && matchesTenant && matchesPossession && matchesStatus;
          });
          exportData = filteredProps.map(p => {
            const yearHistory = p.iptuHistory.find(h => h.year === filterYear);

            // Tenta mapear o máximo de colunas comuns
            return {
              'Property': p.name,
              'Nome': p.name,
              'Inscrição': p.registrationNumber,
              'Bairro': p.neighborhood,
              'Cidade': p.city,
              'City': p.city,
              'Proprietário': p.ownerName,
              'Owner': p.ownerName,
              'Tipo': p.type,
              'Type': p.type,
              'Valor Avaliação': p.appraisalValue,
              'Status Atual': yearHistory?.status || 'N/A',
              'Current Status': yearHistory?.status || 'N/A',
              'Last Update': p.lastUpdated,
              'Posse': p.possession
            };
          });
        }
      }

      if (exportData.length === 0) {
        alert("Não há dados disponíveis para exportar neste relatório.");
        setIsExporting(false);
        return;
      }

      // Filtrar colunas baseado na seleção do usuário
      const filteredExportData = exportData.map(row => {
        const filteredRow: any = {};

        // Mapear colunas selecionadas para as chaves reais do objeto de dados
        // Isso resolve o problema de labels dinâmicos como (Base) vs (2025)
        selectedColumns.forEach(colLabel => {
          let key = colLabel;

          if (selectedReport.id === 'proj_anual') {
            if (colLabel === 'Cota Única (Base)') key = `Cota Única (${baseYear})`;
            if (colLabel === 'Parcelado (Base)') key = `Parcelado (${baseYear})`;
            if (colLabel === 'Cota Única (Projeção)') key = `Cota Única (${compareYear})`;
            if (colLabel === 'Parcelado (Projeção)') key = `Parcelado (${compareYear})`;
          }

          if (row[key] !== undefined) {
            filteredRow[key] = row[key];
          }
        });

        // Preservar metadados para agrupamento e formatação sem exibir na tabela
        filteredRow._isTotal = row.isTotal;
        filteredRow._groupKey = row['Nome do Imóvel'];
        filteredRow._month = row._month;

        return filteredRow;
      });

      if (exportFormat === 'PDF') {
        const doc = new jsPDF('landscape');
        const tableColumn = Object.keys(filteredExportData[0]).filter(k => !k.startsWith('_'));

        if (selectedReport.id === 'rateio_detalhado') {
          // Agrupar por Imóvel para que cada um fique em sua página
          const groups: Record<string, any[]> = {};
          filteredExportData.forEach(row => {
            const key = row._groupKey || 'OUTROS';
            if (key === 'TOTAIS') return;
            if (!groups[key]) groups[key] = [];
            groups[key].push(row);
          });

          let isFirst = true;
          Object.entries(groups).forEach(([propertyName, rows]) => {
            if (!isFirst) doc.addPage();
            isFirst = false;

            const tableRows = rows.map(obj => tableColumn.map(col => {
              let val = obj[col];
              // Limpar nome do imóvel na linha de total para não repetir, se solicitado
              if (obj._isTotal && col === 'Nome do Imóvel') val = '';

              if (typeof val === 'number') {
                const isCurrency = col.toLowerCase().includes('valor') ||
                  col.toLowerCase().includes('rateio') ||
                  col.toLowerCase().includes('cota') ||
                  col.toLowerCase().includes('parcelado');

                if (isCurrency) {
                  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                }
                return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              }
              return val;
            }));

            autoTable(doc, {
              head: [tableColumn],
              body: tableRows,
              startY: 40,
              margin: { top: 40 },
              styles: { fontSize: 8, cellPadding: 2 },
              headStyles: { fillColor: [196, 84, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
              alternateRowStyles: { fillColor: [245, 245, 245] },
              didDrawPage: (data) => {
                doc.setFontSize(18);
                doc.setTextColor(196, 84, 27);
                doc.text(titleText, 14, 22);

                doc.setFontSize(11);
                doc.setTextColor(100, 110, 120);
                doc.text(`Nome do Imóvel: ${propertyName}`, 14, 30);

                const pageWidth = doc.internal.pageSize.getWidth();
                const logoWidth = 45;
                const logoHeight = 15;
                const xPos = pageWidth - logoWidth - 14;
                try {
                  doc.addImage(logo, 'PNG', xPos, 10, logoWidth, logoHeight);
                } catch (e) {
                  console.error("Erro ao adicionar logo ao PDF:", e);
                }
              },
              didParseCell: (data) => {
                if (data.section === 'body') {
                  const rowData = rows[data.row.index];
                  if (rowData._isTotal) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [255, 240, 230];
                  }
                }
              }
            });
          });

          // Removida página de totais consolidados conforme solicitado
        } else if (selectedReport.id === 'iptu_vencimentos') {
          // Agrupar por Mês para que cada um fique em sua página
          const groups: Record<number, any[]> = {};
          const monthNames = [
            'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
            'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO', 'N/A'
          ];

          filteredExportData.forEach(row => {
            if (row.Imóvel === 'TOTAIS') return;
            const monthIdx = row._month !== undefined ? row._month : 12;
            if (!groups[monthIdx]) groups[monthIdx] = [];
            groups[monthIdx].push(row);
          });

          let isFirst = true;
          // Ordenar meses
          const sortedMonths = Object.keys(groups).map(Number).sort((a, b) => a - b);

          sortedMonths.forEach(monthIdx => {
            const rows = groups[monthIdx];
            if (!isFirst) doc.addPage();
            isFirst = false;

            const tableRows = rows.map(obj => tableColumn.map(col => {
              const val = obj[col];
              if (typeof val === 'number') {
                return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              }
              return val;
            }));

            autoTable(doc, {
              head: [tableColumn],
              body: tableRows,
              startY: 40,
              margin: { top: 40 },
              styles: { fontSize: 8, cellPadding: 2 },
              headStyles: { fillColor: [196, 84, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
              alternateRowStyles: { fillColor: [245, 245, 245] },
              didDrawPage: (data) => {
                doc.setFontSize(18);
                doc.setTextColor(196, 84, 27);
                doc.text(titleText, 14, 22);

                doc.setFontSize(11);
                doc.setTextColor(100, 110, 120);

                const monthLabel = monthNames[monthIdx];
                const cityLabel = filterCity.length === 0 ? 'TODAS' : filterCity.join(', ');
                const ufLabel = filterUF.length === 0 ? 'TODAS' : filterUF.join(', ');
                const filterText = `Mês: ${monthLabel} | Cidade (${cityLabel}) | UF (${ufLabel}) | Ano (${filterYear})`;

                doc.text(filterText, 14, 30);

                const pageWidth = doc.internal.pageSize.getWidth();
                const logoWidth = 45;
                const logoHeight = 15;
                const xPos = pageWidth - logoWidth - 14;
                try {
                  doc.addImage(logo, 'PNG', xPos, 10, logoWidth, logoHeight);
                } catch (e) {
                  console.error("Erro ao adicionar logo ao PDF:", e);
                }
              }
            });
          });
        } else {
          // Lógica original para os demais relatórios
          const tableRows = filteredExportData.map(obj => tableColumn.map(col => {
            const val = obj[col];
            if (typeof val === 'number') {
              return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }
            return val;
          }));

          autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            margin: { top: 40 },
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [196, 84, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            didDrawPage: (data) => {
              doc.setFontSize(18);
              doc.setTextColor(196, 84, 27);
              doc.text(titleText, 14, 22);

              doc.setFontSize(11);
              doc.setTextColor(100, 110, 120);

              const cityLabel = filterCity.length === 0 ? 'TODAS' : filterCity.join(', ');
              const ufLabel = filterUF.length === 0 ? 'TODAS' : filterUF.join(', ');
              let filterText = `Filtros: Cidade (${cityLabel}) | UF (${ufLabel}) | Ano (${filterYear})`;

              if (selectedReport.id === 'economia_cota_unica' && filterMinSavings > 0) {
                filterText += ` | Economia > ${filterMinSavings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
              }

              doc.text(filterText, 14, 30);

              const pageWidth = doc.internal.pageSize.getWidth();
              const logoWidth = 45;
              const logoHeight = 15;
              const xPos = pageWidth - logoWidth - 14;

              try {
                doc.addImage(logo, 'PNG', xPos, 10, logoWidth, logoHeight);
              } catch (e) {
                console.error("Erro ao adicionar logo ao PDF:", e);
              }
            },
            didParseCell: (data) => {
              if (data.section === 'body' && data.row.index === tableRows.length - 1) {
                if (data.row.cells[0].text[0] === 'TOTAIS') {
                  data.cell.styles.fontStyle = 'bold';
                  data.cell.styles.fillColor = [255, 240, 230];
                }
              }
            }
          });
        }

        doc.save(filename);
      }
      else {
        // Limpar dados para o Excel (remover metadados e ocultar nome do imóvel nos totais)
        const cleanXlsxData = filteredExportData.map(row => {
          const cleanRow = { ...row };
          if (cleanRow._isTotal) cleanRow['Nome do Imóvel'] = '';

          Object.keys(cleanRow).forEach(key => {
            if (key.startsWith('_')) delete cleanRow[key];
          });
          return cleanRow;
        });

        const worksheet = XLSX.utils.json_to_sheet(cleanXlsxData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");

        const maxLengths = Object.keys(filteredExportData[0]).map(key => {
          const headerLen = key.length;
          const dataLen = filteredExportData.reduce((max, row) => Math.max(max, String(row[key] || '').length), 0);
          return { wch: Math.max(headerLen, dataLen) + 2 };
        });
        worksheet['!cols'] = maxLengths;

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blobData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const url = window.URL.createObjectURL(blobData);
        const link = document.createElement('a');
        link.href = url;
        const safeFilename = filename.replace(/[^a-z0-9.]/gi, '_');
        link.setAttribute('download', safeFilename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      setTimeout(() => {
        setIsExporting(false);
      }, 1000);

    } catch (error) {
      console.error("Erro na exportação:", error);
      alert("Erro ao gerar o arquivo Excel. Verifique o console.");
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div>
          <h1 className="text-[#111418] dark:text-white text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-[#617289] dark:text-[#9ca3af] mt-1 font-medium">Inteligência de dados e exportação estratégica da carteira.</p>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 h-11 bg-primary hover:bg-[#a64614] text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/30 disabled:opacity-50 active:scale-95"
        >
          {isExporting ? (
            <span className="animate-spin material-symbols-outlined text-[20px]">sync</span>
          ) : (
            <span className="material-symbols-outlined text-[20px]">download</span>
          )}
          <span>{isExporting ? 'GERANDO...' : `EXPORTAR RELATÓRIO (.${exportFormat})`}</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar de Seleção */}
        <aside className="w-full lg:w-80 space-y-4">
          <div className="bg-white dark:bg-[#1a2634] p-4 rounded-xl border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm">
            <h2 className="text-xs font-bold text-[#617289] dark:text-[#9ca3af] uppercase tracking-widest mb-4">Categorias</h2>
            <nav className="space-y-1">
              {['Financeiro', 'Operacional', 'Gerencial', 'Auditoria'].map((cat) => (
                <div key={cat} className="mb-4 last:mb-0">
                  <span className="text-[10px] font-semibold text-primary block mb-1 uppercase px-2">{cat}</span>
                  <div className="space-y-1">
                    {reportSpecs.filter(r => r.category === cat).map(report => (
                      <button
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 ${selectedReport.id === report.id
                          ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]"
                          : "text-[#111418] dark:text-white hover:bg-gray-100 dark:hover:bg-[#22303e]"
                          }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{report.icon}</span>
                        <span className="truncate">{report.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Painel de Detalhes */}
        <main className="flex-1 space-y-6">
          <div className="bg-white dark:bg-[#1a2634] rounded-2xl border border-[#e5e7eb] dark:border-[#2a3644] shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <header className="p-6 border-b-2 border-primary bg-gray-50/50 dark:bg-[#1e2a3b]/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <span className="material-symbols-outlined text-[20px] font-semibold">{selectedReport.icon}</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#111418] dark:text-white uppercase tracking-tight">{selectedReport.title}</h2>
                  <p className="text-xs text-[#617289] dark:text-[#9ca3af]">{selectedReport.description}</p>
                </div>
              </div>
            </header>

            <div className="p-8 space-y-8 flex-1">
              <section className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-6">
                <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">filter_alt</span> Configuração da Exportação
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <MultiSelect
                    label="CIDADE"
                    icon="location_city"
                    options={availableCities}
                    selected={filterCity}
                    onChange={setFilterCity}
                  />

                  <MultiSelect
                    label="UF"
                    icon="map"
                    options={availableUFs}
                    selected={filterUF}
                    onChange={setFilterUF}
                  />

                  <MultiSelect
                    label="PROPRIETÁRIO"
                    icon="person"
                    options={availableOwners}
                    selected={filterOwner}
                    onChange={setFilterOwner}
                  />

                  <MultiSelect
                    label="LOCATÁRIO"
                    icon="group"
                    options={availableTenants}
                    selected={filterTenant}
                    onChange={setFilterTenant}
                  />

                  <MultiSelect
                    label="STATUS"
                    icon="payments"
                    options={[
                      { value: IptuStatus.PAID, label: 'PAGO' },
                      { value: IptuStatus.IN_PROGRESS, label: 'EM ANDAMENTO' },
                      { value: IptuStatus.PENDING, label: 'PENDENTE' },
                      { value: IptuStatus.OPEN, label: 'EM ABERTO' },
                    ]}
                    selected={filterPaymentStatus}
                    onChange={setFilterPaymentStatus}
                  />

                  <MultiSelect
                    label="POSSE"
                    icon="admin_panel_settings"
                    options={[
                      { value: 'Grupo', label: 'GRUPO' },
                      { value: 'Terceiros', label: 'TERCEIROS' },
                      { value: 'Específico', label: 'ESPECÍFICO' },
                    ]}
                    selected={filterPossession}
                    onChange={setFilterPossession}
                  />

                  <MultiSelect
                    label="SITUAÇÃO"
                    icon="event_busy"
                    options={[
                      { value: 'Locado', label: 'LOCADO' },
                      { value: 'Disponível', label: 'DISPONÍVEL' },
                    ]}
                    selected={filterOccupancy}
                    onChange={setFilterOccupancy}
                  />

                  {selectedReport.id === 'proj_anual' ? (
                    <>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Ano Base</label>
                        <input
                          type="number"
                          value={baseYear}
                          onChange={(e) => setBaseYear(Number(e.target.value))}
                          title="Ano Base para Comparação"
                          placeholder="Ex: 2025"
                          className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-[10px] font-bold outline-none focus:border-primary transition-all text-[#111418] dark:text-white"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Ano Projeção</label>
                        <input
                          type="number"
                          value={compareYear}
                          onChange={(e) => setCompareYear(Number(e.target.value))}
                          title="Ano Projetado para Comparação"
                          placeholder="Ex: 2026"
                          className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-[10px] font-bold outline-none focus:border-primary transition-all text-[#111418] dark:text-white"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Status (Projeção)</label>
                        <select
                          value={projAnualStatusFilter}
                          onChange={(e) => setProjAnualStatusFilter(e.target.value)}
                          title="Filtro de Status para o Ano de Projeção"
                          className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-[10px] font-bold outline-none focus:border-primary transition-all text-[#111418] dark:text-white"
                        >
                          <option value="TODOS">TODOS</option>
                          <option value={IptuStatus.PAID}>PAGO</option>
                          <option value={IptuStatus.IN_PROGRESS}>EM ANDAMENTO</option>
                          <option value={IptuStatus.PENDING}>PENDENTE</option>
                          <option value={IptuStatus.OPEN}>EM ABERTO</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Ano Base</label>
                      <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(Number(e.target.value))}
                        title="Selecionar Ano"
                        className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-[10px] font-bold outline-none focus:border-primary transition-all text-[#111418] dark:text-white"
                      >
                        {availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedReport.id === 'economia_cota_unica' && (
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Economia Mínima</label>
                      <select
                        value={filterMinSavings}
                        onChange={(e) => setFilterMinSavings(Number(e.target.value))}
                        title="Filtro de Faixa de Economia"
                        className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-[10px] font-bold outline-none focus:border-primary transition-all text-[#111418] dark:text-white"
                      >
                        <option value={0}>TOTAL</option>
                        <option value={1000}>&gt; R$ 1.000</option>
                        <option value={5000}>&gt; R$ 5.000</option>
                        <option value={10000}>&gt; R$ 10.000</option>
                        <option value={25000}>&gt; R$ 25.000</option>
                        <option value={50000}>&gt; R$ 50.000</option>
                      </select>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Formato de Saída</label>
                    <div className="flex bg-white dark:bg-[#1a2634] rounded-xl border border-gray-200 dark:border-gray-700 p-1 h-11">
                      <button
                        onClick={() => setExportFormat('XLSX')}
                        className={`flex-1 h-full rounded-lg text-[10px] font-black transition-all ${exportFormat === 'XLSX' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                      >XLSX</button>
                      <button
                        onClick={() => setExportFormat('PDF')}
                        className={`flex-1 h-full rounded-lg text-[10px] font-black transition-all ${exportFormat === 'PDF' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                      >PDF</button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">target</span> Objetivo do Relatório
                  </h3>
                  <p className="text-sm text-[#111418] dark:text-white font-medium leading-relaxed bg-gray-50 dark:bg-[#22303e] p-4 rounded-xl border border-gray-100 dark:border-gray-800 italic">
                    "{selectedReport.goal}"
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">functions</span> Métricas Estratégicas
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedReport.metrics?.map((metric, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm font-semibold text-[#111418] dark:text-white">
                        <span className="size-2 rounded-full bg-primary"></span>
                        {metric}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">view_column</span> Estrutura de Colunas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedReport.columns.map((col, i) => {
                    const isSelected = selectedColumns.includes(col);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleColumn(col)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border transition-all flex items-center gap-1.5 ${isSelected
                          ? "bg-primary/10 text-primary border-primary shadow-sm"
                          : "bg-gray-50 dark:bg-[#111c2a] text-[#9ca3af] border-gray-200 dark:border-gray-800 opacity-60 hover:opacity-100"
                          }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isSelected ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        {col}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="mt-auto pt-8 border-t border-gray-100 dark:border-gray-800">
                <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary font-bold">lightbulb</span>
                  <p className="text-xs text-[#111418] dark:text-slate-300 font-medium">
                    <strong>Dica de Formatação:</strong> Ao abrir este arquivo no Excel, os dados estarão organizados em Tabelas Estruturadas com filtros automáticos e formatação condicional pré-aplicada para facilitar sua análise gerencial.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportsView;
