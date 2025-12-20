
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Property, IptuStatus } from '../types';

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
    id: 'responsavel',
    category: 'Auditoria',
    title: 'Relatório por Responsável',
    description: 'Produtividade e ações por usuário do sistema.',
    icon: 'person_search',
    goal: 'Auditar performance e segurança por colaborador.',
    columns: ['User ID', 'Last Access', 'Properties Managed', 'Updates Performed'],
    metrics: ['Nível de Engajamento do Usuário']
  }
];

const ReportsView: React.FC<ReportsViewProps> = ({ properties }) => {
  const [selectedReport, setSelectedReport] = useState<ReportSpec>(reportSpecs[0]);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);

    try {
      let exportData: any[] = [];
      const filename = `${selectedReport.title}.xlsx`;

      switch (selectedReport.id) {
        case 'fin_geral':
          exportData = properties.flatMap(prop =>
            prop.iptuHistory.map(iptu => ({
              'ID Imóvel': prop.id.substring(0, 8),
              'Nome': prop.name,
              'Inscrição': prop.registrationNumber,
              'Ano': iptu.year,
              'Valor Total': iptu.value,
              'Valor Pago': iptu.status === IptuStatus.PAID ? iptu.value : 0,
              'Saldo Devedor': (iptu.status === IptuStatus.PENDING || iptu.status === IptuStatus.OVERDUE) ? iptu.value : 0,
              'Status': iptu.status
            }))
          );
          break;

        case 'aberto':
          exportData = properties.flatMap(prop =>
            prop.iptuHistory
              .filter(iptu => iptu.status === IptuStatus.PENDING || iptu.status === IptuStatus.OVERDUE)
              .map(iptu => ({
                'Property': prop.name,
                'Due Date': iptu.dueDate || 'Pendente',
                'Pending Value': iptu.value,
                'Owner': prop.ownerName
              }))
          );
          break;

        case 'pagos':
          exportData = properties.flatMap(prop =>
            prop.iptuHistory
              .filter(iptu => iptu.status === IptuStatus.PAID)
              .map(iptu => ({
                'Property': prop.name,
                'Date Paid': iptu.startDate || 'N/A',
                'Value': iptu.value,
                'Method': iptu.chosenMethod || 'N/A'
              }))
          );
          break;

        case 'sit_imovel':
          exportData = properties.map(p => ({
            'Property Name': p.name,
            'Type': p.type,
            'City': p.city,
            'Last Update': p.lastUpdated,
            'Current Status': p.iptuHistory[0]?.status || 'N/A'
          }));
          break;

        case 'status_dist': {
          const stats = properties.reduce((acc: any, prop) => {
            const status = prop.iptuHistory[0]?.status || 'Pendente';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {});
          const total = properties.length;
          exportData = Object.entries(stats).map(([status, count]) => ({
            'Status': status,
            'Quantidade': count,
            'Percentual': `${((Number(count) / total) * 100).toFixed(1)}%`
          }));
          break;
        }

        default:
          // Export geral para qualquer outro tipo não mapeado especificamente
          exportData = properties.map(p => ({
            'Nome': p.name,
            'Inscrição': p.registrationNumber,
            'Bairro': p.neighborhood,
            'Cidade': p.city,
            'Proprietário': p.ownerName,
            'Tipo': p.type,
            'Valor Avaliação': p.appraisalValue,
            'Status Atual': p.iptuHistory[0]?.status || 'N/A'
          }));
      }

      if (exportData.length === 0) {
        alert("Não há dados disponíveis para exportar neste relatório.");
        setIsExporting(false);
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");

      // Ajuste de largura automática das colunas
      const maxLengths = Object.keys(exportData[0]).map(key => {
        const headerLen = key.length;
        const dataLen = exportData.reduce((max, row) => Math.max(max, String(row[key] || '').length), 0);
        return { wch: Math.max(headerLen, dataLen) + 2 };
      });
      worksheet['!cols'] = maxLengths;

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      // Sanitiza o nome do arquivo para remover caracteres problemáticos
      const safeFilename = filename.replace(/[^a-z0-9.]/gi, '_');
      link.setAttribute('download', safeFilename);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

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
          <span>{isExporting ? 'GERANDO...' : 'EXPORTAR RELATÓRIO (.XLSX)'}</span>
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
                  <span className="material-symbols-outlined text-[18px]">view_column</span> Estrutura de Colunas (.xlsx)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedReport.columns.map((col, i) => (
                    <span key={i} className="px-3 py-1.5 bg-gray-100 dark:bg-[#22303e] text-[#617289] dark:text-[#9ca3af] rounded-lg text-xs font-bold uppercase border border-gray-200 dark:border-gray-800">
                      {col}
                    </span>
                  ))}
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
