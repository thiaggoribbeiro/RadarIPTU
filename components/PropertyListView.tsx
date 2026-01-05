
import React, { useState } from 'react';
import { Property, IptuStatus, UserRole } from '../types';
import { getDynamicStatus } from '../utils/iptu';

interface PropertyListViewProps {
  onSelectProperty: (id: string) => void;
  onAddProperty: () => void;
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (id: string) => void;
  onOpenIptuConfig: (property: Property) => void;
  properties: Property[];
  userRole: UserRole;
}

const PropertyListView: React.FC<PropertyListViewProps> = ({ onSelectProperty, onAddProperty, onEditProperty, onDeleteProperty, onOpenIptuConfig, properties, userRole }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase()) ||
      p.registrationNumber.includes(search);
    const matchesType = filterType === 'all' || p.type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesType;
  });

  const canDelete = userRole === 'Gestor' || userRole === 'Administrador';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111418] dark:text-white">Imóveis</h1>
          <p className="text-[#617289] dark:text-[#9ca3af] font-medium">Gestão detalhada do Imposto Predial e Territorial Urbano.</p>
        </div>
        <button
          onClick={onAddProperty}
          className="flex items-center justify-center gap-2 rounded-xl h-11 px-6 bg-primary hover:bg-[#a64614] transition-colors text-white font-bold shadow-lg shadow-primary/30"
        >
          <span className="material-symbols-outlined font-semibold">add</span>
          <span>Adicionar Imóvel</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#1a2634] p-4 rounded-xl shadow-sm border border-[#e5e7eb] dark:border-[#2a3644] flex flex-col xl:flex-row gap-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#617289] dark:text-[#9ca3af] text-[20px]">search</span>
          <input
            type="text"
            placeholder="Buscar por nome, endereço, inscrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#e5e7eb] dark:border-[#2a3644] bg-transparent text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[#111418] dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-1.5 items-center bg-gray-50 dark:bg-[#22303e] p-1 rounded-lg border border-[#e5e7eb] dark:border-[#2a3644]">
            {['all', 'Loja', 'Galpão', 'Sala', 'Apartamento'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${filterType === type
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-[#617289] dark:text-[#9ca3af] hover:text-[#111418] dark:hover:text-white'
                  }`}
              >
                {type === 'all' ? 'TODOS' : type.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-gray-50 dark:bg-[#22303e] p-1 rounded-lg border border-[#e5e7eb] dark:border-[#2a3644]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all flex items-center justify-center ${viewMode === 'grid'
                ? 'bg-primary text-white shadow-sm'
                : 'text-[#617289] dark:text-[#9ca3af] hover:text-[#111418] dark:hover:text-white'
                }`}
            >
              <span className="material-symbols-outlined text-[20px] font-semibold">grid_view</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all flex items-center justify-center ${viewMode === 'list'
                ? 'bg-primary text-white shadow-sm'
                : 'text-[#617289] dark:text-[#9ca3af] hover:text-[#111418] dark:hover:text-white'
                }`}
            >
              <span className="material-symbols-outlined text-[20px] font-semibold">format_list_bulleted</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {filteredProperties.map(property => {
            const currentYear = new Date().getFullYear();
            const currentIptu = property.iptuHistory.find(h => h.year === currentYear);
            const currentYearStatus = currentIptu ? getDynamicStatus(currentIptu) : IptuStatus.PENDING;

            const hasPreviousDebts = property.iptuHistory.some(h => h.year < currentYear && getDynamicStatus(h) !== IptuStatus.PAID);

            return (
              <div key={property.id} className="bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group flex flex-col">
                <div className="relative h-48" onClick={() => onSelectProperty(property.id)}>
                  <img src={property.imageUrl} alt={property.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-500">
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${currentYearStatus === IptuStatus.PAID ? 'bg-emerald-500 text-white' :
                        currentYearStatus === IptuStatus.OVERDUE ? 'bg-red-500 text-white' : 'bg-primary text-white'
                        }`}>{currentYearStatus}</span>

                      {hasPreviousDebts && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm bg-red-600 text-white flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">warning</span>
                          DÉBITOS ANTERIORES
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenIptuConfig(property); }}
                        className="h-8 px-3 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg backdrop-blur-sm text-[10px] font-black uppercase tracking-tighter"
                        title="Configurar Sequenciais e Locatários"
                      >
                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        INSERIR IPTU
                      </button>
                    </div>
                    {canDelete && (
                      <div className="flex gap-2 self-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditProperty(property); }}
                          className="size-8 flex items-center justify-center rounded-lg bg-white/90 text-[#111418] hover:bg-white transition-all shadow-lg backdrop-blur-sm"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteProperty(property.id); }}
                          className="size-8 flex items-center justify-center rounded-lg bg-red-500/80 text-white hover:bg-red-600 transition-all shadow-lg backdrop-blur-sm"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <span className="px-2.5 py-1 rounded-md bg-black/50 text-white text-[10px] font-semibold backdrop-blur-sm">{property.type}</span>
                  </div>
                </div>
                <div className="p-5 flex-1" onClick={() => onSelectProperty(property.id)}>
                  <h3 className="text-lg font-bold text-[#111418] dark:text-white group-hover:text-secondary transition-colors">{property.name}</h3>
                  <p className="text-sm font-medium text-[#617289] dark:text-[#9ca3af] mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    {property.neighborhood}, {property.city}
                  </p>
                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-[#2a3644] flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[#617289] uppercase tracking-tighter">Referência</span>
                      <span className="text-sm font-bold text-[#111418] dark:text-white">{property.registrationNumber}</span>
                    </div>
                    <button className="text-primary font-bold text-sm flex items-center gap-1 hover:text-secondary">
                      DETALHES <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-[#22303e] border-b-2 border-primary">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Imóvel</th>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Inscrição</th>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Posse</th>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Status</th>
                  <th className="px-6 py-4 text-right text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#2a3644]">
                {filteredProperties.map(property => {
                  const currentYear = new Date().getFullYear();
                  const currentIptu = property.iptuHistory.find(h => h.year === currentYear);
                  const currentYearStatus = currentIptu ? getDynamicStatus(currentIptu) : IptuStatus.PENDING;
                  const hasPreviousDebts = property.iptuHistory.some(h => h.year < currentYear && getDynamicStatus(h) !== IptuStatus.PAID);

                  return (
                    <tr key={property.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => onSelectProperty(property.id)}>
                      <td className="px-6 py-4 text-sm font-bold">{property.name}</td>
                      <td className="px-6 py-4 text-sm font-mono tracking-tight">{property.registrationNumber}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${property.possession === 'Grupo' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {property.possession}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase ${currentYearStatus === IptuStatus.PAID ? 'bg-emerald-100 text-emerald-700' :
                            currentYearStatus === IptuStatus.OVERDUE ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                            {currentYearStatus}
                          </span>
                          {hasPreviousDebts && (
                            <span className="w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">warning</span>
                              DÉBITOS
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); onOpenIptuConfig(property); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100"
                          >
                            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                            INSERIR IPTU
                          </button>
                          {canDelete && (
                            <div className="flex gap-1 border-l border-gray-100 dark:border-gray-700 pl-3 ml-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); onEditProperty(property); }}
                                className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              >
                                <span className="material-symbols-outlined text-[20px]">edit</span>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteProperty(property.id); }}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </div>
                          )}
                          <span className="material-symbols-outlined text-primary font-semibold">chevron_right</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyListView;
