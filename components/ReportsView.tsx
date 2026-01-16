
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo-report.png';
import { Property, IptuStatus } from '../types';
import { getPropertyStatus } from '../utils/iptu';

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
    columns: ['ID Imóvel', 'Nome', 'Inscrição', 'Ano', 'Valor Total', 'Valor Pago', 'Saldo Devedor', 'Status'],
    metrics: ['Total Provisionado', 'Total Arrecadado', 'Ticket Médio por Imóvel']
  },
  {
    id: 'aberto',
    category: 'Financeiro',
    title: 'Valores em Aberto',
    description: 'Listagem de débitos pendentes e vencimentos.',
    icon: 'pending',
    goal: 'Identificar inadimplência e fluxos de caixa futuros.',
    columns: ['Property', 'Due Date', 'Pending Value', 'Days Overdue', 'Owner'],
    metrics: ['Aging de Dívida', 'Total em Atraso > 30 dias']
  },
  {
    id: 'pagos',
    category: 'Financeiro',
    title: 'Pagamentos Efetuados',
    description: 'Histórico detalhado de quitações e métodos.',
    icon: 'payments',
    goal: 'Conciliação bancária e comprovação de pagamentos.',
    columns: ['Property', 'Date Paid', 'Value', 'Method', 'Receipt Reference'],
    metrics: ['Percentual Cota Única vs Parcelado']
  },
  {
    id: 'sit_imovel',
    category: 'Operacional',
    title: 'Situação por Imóvel',
    description: 'Raio-X individual de cada unidade da carteira.',
    icon: 'location_city',
    goal: 'Visão operacional rápida para gestores de condomínio/imobiliária.',
    columns: ['Property Name', 'Type', 'City', 'Last Update', 'Current Status'],
    metrics: ['Indicador de Regularização Individual']
  },
  {
    id: 'parcelamentos',
    category: 'Operacional',
    title: 'Relatório de Parcelamentos',
    description: 'Acompanhamento de acordos e parcelas vincendas.',
    icon: 'event_repeat',
    goal: 'Monitorar a evolução de pagamentos fracionados.',
    columns: ['Property', 'Total Installments', 'Current Installment', 'Next Due Date', 'Value'],
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
    columns: ['Property', 'Value 2023', 'Value 2024', 'Variation (%)'],
    metrics: ['CAGR (Taxa de Crescimento Anual Composta)']
  },
  {
    id: 'impacto',
    category: 'Gerencial',
    title: 'Impacto Financeiro',
    description: 'Analise de multas, juros e descontos aplicados.',
    icon: 'trending_up',
    goal: 'Avaliar economia gerada por pagamentos em cota única.',
    columns: ['Property', 'Gross Value', 'Discount (Cota Única)', 'Final Value'],
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
    columns: ['Proprietário', 'Inscrição', 'Endereço', 'Cota Única (Base)', 'Parcelado (Base)', 'Cota Única (Projeção)', 'Parcelado (Projeção)', 'Diferença Cota Única', 'Economia Projetada', '% Variação', 'Situação'],
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
  const [filterCity, setFilterCity] = useState<string>('TODAS');
  const [filterYear, setFilterYear] = useState<number>(2026); // Ano para filtros gerais
  const [baseYear, setBaseYear] = useState<number>(2025);
  const [compareYear, setCompareYear] = useState<number>(2026);
  const [projAnualStatusFilter, setProjAnualStatusFilter] = useState<string>('TODOS');
  const [exportFormat, setExportFormat] = useState<'XLSX' | 'PDF'>('XLSX');

  const availableCities = useMemo(() => {
    return ['TODAS', ...new Set(properties.map(p => p.city))].sort();
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
        case 'proj_anual': {
          let filteredProps = filterCity === 'TODAS' ? properties : properties.filter(p => p.city === filterCity);

          if (projAnualStatusFilter !== 'TODOS') {
            filteredProps = filteredProps.filter(p => getPropertyStatus(p, compareYear) === projAnualStatusFilter);
          }

          exportData = filteredProps.flatMap(prop => {
            const unitsBase = prop.units.filter(u => u.year === baseYear);
            const unitsCompare = prop.units.filter(u => u.year === compareYear);

            // Mapeia todos os sequenciais únicos dos dois anos
            const allSequentials = new Set([
              ...unitsBase.map(u => u.sequential),
              ...unitsCompare.map(u => u.sequential)
            ]);

            return Array.from(allSequentials).map(seq => {
              const uBase = unitsBase.find(u => u.sequential === seq);
              const uComp = unitsCompare.find(u => u.sequential === seq);

              const cotaUnicaBase = uBase?.singleValue || 0;
              const parceladoBase = uBase?.installmentValue || 0;

              const cotaUnicaComp = uComp?.singleValue || 0;
              const parceladoComp = uComp?.installmentValue || 0;

              const diferenca = cotaUnicaComp - cotaUnicaBase;
              const economia = parceladoComp - cotaUnicaComp;
              const variacao = cotaUnicaBase > 0 ? (diferenca / cotaUnicaBase) * 100 : 0;

              const tenants = prop.tenants.filter(t => t.year === compareYear && (t.selectedSequential === seq || !t.selectedSequential));
              const situacao = tenants.length > 0 ? tenants.map(t => t.name).join(', ') : 'DISPONÍVEL';

              return {
                'Proprietário': prop.ownerName || 'N/A',
                'Inscrição': uComp?.registrationNumber || uBase?.registrationNumber || prop.registrationNumber,
                'Endereço': `${prop.address}${seq !== prop.sequential ? ` - Seq: ${seq}` : ''}`,
                [`Cota Única (${baseYear})`]: cotaUnicaBase,
                [`Parcelado (${baseYear})`]: parceladoBase,
                [`Cota Única (${compareYear})`]: cotaUnicaComp,
                [`Parcelado (${compareYear})`]: parceladoComp,
                'Diferença Cota Única': diferenca,
                'Economia Projetada': economia,
                '% Variação': `${variacao.toFixed(2)}%`,
                'Situação': situacao
              };
            });
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

        case 'fin_geral': {
          const filteredProps = filterCity === 'TODAS' ? properties : properties.filter(p => p.city === filterCity);
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
                'Status': iptu.status
              }))
          );
          break;
        }

        case 'aberto': {
          const filteredProps = filterCity === 'TODAS' ? properties : properties.filter(p => p.city === filterCity);
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
                  'Owner': prop.ownerName
                };
              })
          );
          break;
        }

        case 'pagos': {
          const filteredProps = filterCity === 'TODAS' ? properties : properties.filter(p => p.city === filterCity);
          exportData = filteredProps.flatMap(prop =>
            prop.iptuHistory
              .filter(iptu => iptu.year === filterYear && iptu.status === IptuStatus.PAID)
              .map(iptu => ({
                'Property': prop.name,
                'Date Paid': iptu.startDate || 'N/A',
                'Value': iptu.value,
                'Method': iptu.chosenMethod || 'N/A',
                'Receipt Reference': iptu.receiptUrl ? 'Anexo' : 'N/A'
              }))
          );
          break;
        }

        case 'sit_imovel': {
          const filteredProps = filterCity === 'TODAS' ? properties : properties.filter(p => p.city === filterCity);
          exportData = filteredProps.map(p => {
            const yearHistory = p.iptuHistory.find(h => h.year === filterYear);
            return {
              'Property Name': p.name,
              'Type': p.type,
              'City': p.city,
              'Last Update': p.lastUpdated,
              'Current Status': yearHistory?.status || 'N/A'
            };
          });
          break;
        }

        case 'status_dist': {
          const filteredProps = filterCity === 'TODAS' ? properties : properties.filter(p => p.city === filterCity);
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

        default: {
          // Export geral para qualquer outro tipo não mapeado especificamente
          const filteredProps = filterCity === 'TODAS' ? properties : properties.filter(p => p.city === filterCity);
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
              'Last Update': p.lastUpdated
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
        return filteredRow;
      });

      if (exportFormat === 'PDF') {
        const doc = new jsPDF('landscape');
        const tableColumn = Object.keys(filteredExportData[0]);
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
          startY: 40, // Aumentado para acomodar título e subtítulo
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [196, 84, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          didDrawPage: (data) => {
            // Desenha o Título (Title Case)
            doc.setFontSize(18);
            doc.setTextColor(196, 84, 27);
            doc.text(titleText, 14, 22);

            // Desenha a Cidade como subtítulo
            doc.setFontSize(11);
            doc.setTextColor(100, 110, 120);
            doc.text(`Cidade: ${filterCity}`, 14, 30);

            // Desenha a Logomarca no canto superior direito
            const pageWidth = doc.internal.pageSize.getWidth();
            const logoWidth = 45;
            const logoHeight = 15;
            const xPos = pageWidth - logoWidth - 14; // Margem de 14mm

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
                data.cell.styles.fillColor = [255, 240, 230]; // Destaque suave em tom de pêssego
              }
            }
          }
        });

        doc.save(filename);
      } else {
        const worksheet = XLSX.utils.json_to_sheet(filteredExportData);
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {selectedReport.id === 'proj_anual' ? (
                    <>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cidade</label>
                        <select
                          value={filterCity}
                          onChange={(e) => setFilterCity(e.target.value)}
                          title="Selecionar Cidade"
                          className="h-10 px-4 rounded-xl border border-gray-200 bg-white dark:bg-[#1a2634] text-sm font-semibold outline-none focus:border-primary transition-all"
                        >
                          {availableCities.map(city => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Ano Base</label>
                        <input
                          type="number"
                          value={baseYear}
                          onChange={(e) => setBaseYear(Number(e.target.value))}
                          title="Ano Base para Comparação"
                          placeholder="Ex: 2025"
                          className="h-10 px-4 rounded-xl border border-gray-200 bg-white dark:bg-[#1a2634] text-sm font-semibold outline-none focus:border-primary transition-all"
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
                          className="h-10 px-4 rounded-xl border border-gray-200 bg-white dark:bg-[#1a2634] text-sm font-semibold outline-none focus:border-primary transition-all"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Status (Projeção)</label>
                        <select
                          value={projAnualStatusFilter}
                          onChange={(e) => setProjAnualStatusFilter(e.target.value)}
                          title="Filtro de Status para o Ano de Projeção"
                          className="h-10 px-4 rounded-xl border border-gray-200 bg-white dark:bg-[#1a2634] text-sm font-semibold outline-none focus:border-primary transition-all"
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
                    <>
                      {selectedReport.id !== 'iptu_cidade' && selectedReport.id !== 'iptu_estado' && (
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cidade</label>
                          <select
                            value={filterCity}
                            onChange={(e) => setFilterCity(e.target.value)}
                            title="Selecionar Cidade"
                            className="h-10 px-4 rounded-xl border border-gray-200 bg-white dark:bg-[#1a2634] text-sm font-semibold outline-none focus:border-primary transition-all"
                          >
                            {availableCities.map(city => (
                              <option key={city} value={city}>{city}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Ano</label>
                        <select
                          value={filterYear}
                          onChange={(e) => setFilterYear(Number(e.target.value))}
                          title="Selecionar Ano"
                          className="h-10 px-4 rounded-xl border border-gray-200 bg-white dark:bg-[#1a2634] text-sm font-semibold outline-none focus:border-primary transition-all"
                        >
                          {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>

                      <div className="hidden lg:block"></div>
                    </>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Formato de Saída</label>
                    <div className="flex bg-white dark:bg-[#1a2634] rounded-xl border border-gray-200 p-1">
                      <button
                        onClick={() => setExportFormat('XLSX')}
                        className={`flex-1 h-8 rounded-lg text-[10px] font-black transition-all ${exportFormat === 'XLSX' ? 'bg-primary text-white' : 'text-gray-400'}`}
                      >XLSX</button>
                      <button
                        onClick={() => setExportFormat('PDF')}
                        className={`flex-1 h-8 rounded-lg text-[10px] font-black transition-all ${exportFormat === 'PDF' ? 'bg-primary text-white' : 'text-gray-400'}`}
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
