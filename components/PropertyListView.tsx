
import React, { useState } from 'react';
import { Property, IptuStatus, UserRole } from '../types';
import { getDynamicStatus, getPropertyStatus } from '../utils/iptu';

interface PropertyListViewProps {
  onSelectProperty: (id: string) => void;
  onAddProperty: () => void;
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (id: string) => void;
  onOpenIptuConfig: (property: Property, section?: 'units' | 'tenants', year?: number, sequential?: string) => void;
  properties: Property[];
  userRole: UserRole;
}

const PropertyListView: React.FC<PropertyListViewProps> = ({ onSelectProperty, onAddProperty, onEditProperty, onDeleteProperty, onOpenIptuConfig, properties, userRole }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterUF, setFilterUF] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const uniqueCities = React.useMemo(() => {
    const cities = properties.map(p => p.city).filter(Boolean) as string[];
    return Array.from(new Set(cities)).sort();
  }, [properties]);

  const uniqueUFs = React.useMemo(() => {
    const states = properties.map(p => p.state).filter(Boolean) as string[];
    return Array.from(new Set(states)).sort();
  }, [properties]);

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase()) ||
      p.registrationNumber.includes(search);
    const matchesType = filterType === 'all' || p.type.toLowerCase() === filterType.toLowerCase();
    const matchesCity = filterCity === 'all' || p.city === filterCity;
    const matchesUF = filterUF === 'all' || p.state === filterUF;
    return matchesSearch && matchesType && matchesCity && matchesUF;
  });

  const canDelete = userRole === 'Gestor' || userRole === 'Administrador';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#111418] dark:text-white">Imóveis</h1>
          <p className="text-[#617289] dark:text-[#9ca3af] font-medium">Gestão detalhada do Imposto Predial e Territorial Urbano.</p>
        </div>
        <button
          onClick={onAddProperty}
          className="flex items-center justify-center gap-2 rounded-xl h-11 px-6 bg-primary hover:bg-[#a64614] transition-colors text-white font-semibold shadow-lg shadow-primary/30"
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[140px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#617289] dark:text-[#9ca3af] text-[18px]">location_city</span>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full h-11 pl-9 pr-10 rounded-lg border border-[#e5e7eb] dark:border-[#2a3644] bg-transparent text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[#111418] dark:text-white appearance-none cursor-pointer font-medium"
            >
              <option value="all">Cidades</option>
              {uniqueCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#617289] pointer-events-none">expand_more</span>
          </div>

          <div className="relative min-w-[100px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#617289] dark:text-[#9ca3af] text-[18px]">map</span>
            <select
              value={filterUF}
              onChange={(e) => setFilterUF(e.target.value)}
              className="size-full h-11 pl-9 pr-10 rounded-lg border border-[#e5e7eb] dark:border-[#2a3644] bg-transparent text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[#111418] dark:text-white appearance-none cursor-pointer font-medium"
            >
              <option value="all">UF</option>
              {uniqueUFs.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#617289] pointer-events-none">expand_more</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-1.5 items-center bg-gray-50 dark:bg-[#22303e] p-1 rounded-lg border border-[#e5e7eb] dark:border-[#2a3644]">
            {['all', 'Loja', 'Galpão', 'Sala', 'Apartamento'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${filterType === type
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
          {filteredProperties.map(property => {
            const currentYear = 2026; // Fixado em 2026 conforme solicitado pelo usuário
            const currentYearStatus = getPropertyStatus(property, currentYear);
            const hasPreviousDebts = property.iptuHistory.some(h => h.year < currentYear && getDynamicStatus(h) !== IptuStatus.PAID);

            return (
              <div key={property.id} className="bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group flex flex-col">
                <div className="relative h-36" onClick={() => onSelectProperty(property.id)}>
                  <img src={property.imageUrl} alt={property.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute top-3 right-3 animate-in fade-in zoom-in duration-500">
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm ${currentYearStatus === IptuStatus.PAID ? 'bg-emerald-500 text-white' :
                        currentYearStatus === IptuStatus.OPEN ? 'bg-red-500 text-white' : 'bg-primary text-white'
                        }`}>{currentYearStatus}</span>

                      {hasPreviousDebts && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm bg-red-600 text-white flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">warning</span>
                          DÉBITOS
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
                    {canDelete && (
                      <div className="flex gap-1.5 self-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditProperty(property); }}
                          className="size-7 flex items-center justify-center rounded-lg bg-white/90 text-[#111418] hover:bg-white transition-all shadow-md backdrop-blur-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteProperty(property.id); }}
                          className="size-7 flex items-center justify-center rounded-lg bg-red-500/80 text-white hover:bg-red-600 transition-all shadow-md backdrop-blur-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="px-2 py-0.5 rounded bg-black/50 text-white text-[9px] font-bold backdrop-blur-sm">{property.type}</span>
                  </div>
                </div>
                <div className="p-4 flex-1" onClick={() => onSelectProperty(property.id)}>
                  <h3 className="text-sm font-bold text-[#111418] dark:text-white group-hover:text-secondary transition-colors line-clamp-1">{property.name}</h3>
                  <p className="text-[11px] font-medium text-[#617289] dark:text-[#9ca3af] mt-0.5 line-clamp-1" title={property.address}>
                    {property.address}
                  </p>
                  <p className="text-[10px] font-medium text-[#94a3b8] dark:text-[#64748b] mt-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">location_on</span>
                    {property.neighborhood}, {property.city}
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#2a3644] flex justify-between items-center">
                    <div className="flex items-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenIptuConfig(property, 'units'); }}
                        className="h-8 px-3 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md text-[9px] font-bold uppercase tracking-tight"
                        title="Configurar Sequenciais e Locatários"
                      >
                        <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                        INSERIR IPTU
                      </button>
                    </div>
                    <button className="text-primary font-bold text-[10px] flex items-center gap-0.5 hover:text-secondary uppercase tracking-tight">
                      DETALHES <span className="material-symbols-outlined text-[14px]">chevron_right</span>
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
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Posse</th>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Status</th>
                  <th className="px-6 py-4 text-right text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#2a3644]">
                {filteredProperties.map(property => {
                  const currentYear = 2026;
                  const currentYearStatus = getPropertyStatus(property, currentYear);
                  const hasPreviousDebts = property.iptuHistory.some(h => h.year < currentYear && getDynamicStatus(h) !== IptuStatus.PAID);

                  return (
                    <tr key={property.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => onSelectProperty(property.id)}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[#111418] dark:text-white">{property.name}</span>
                          <span className="text-[12px] text-[#617289] dark:text-[#9ca3af] mt-0.5 line-clamp-1">{property.address}</span>
                          <span className="text-[11px] text-[#94a3b8] dark:text-[#64748b] mt-0.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">location_on</span>
                            {property.city} - {property.state}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${property.possession === 'Grupo' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {property.possession}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${currentYearStatus === IptuStatus.PAID ? 'bg-emerald-100 text-emerald-700' :
                            currentYearStatus === IptuStatus.OPEN ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                            {currentYearStatus}
                          </span>
                          {hasPreviousDebts && (
                            <span className="w-fit px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-red-100 text-red-700 flex items-center gap-1">
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
