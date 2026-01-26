
import React, { useState } from 'react';
import { Property, IptuStatus, UserRole } from '../types';
import { getDynamicStatus, getPropertyStatus, hasPreviousDebts } from '../utils/iptu';

interface PropertyListViewProps {
  onSelectProperty: (id: string) => void;
  onAddProperty: () => void;
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (id: string) => void;
  onOpenIptuConfig: (property: Property, section?: 'units' | 'tenants' | 'newCharge', year?: number, sequential?: string, registrationNumber?: string) => void;
  properties: Property[];
  userRole: UserRole;
}

const PropertyListView: React.FC<PropertyListViewProps> = ({ onSelectProperty, onAddProperty, onEditProperty, onDeleteProperty, onOpenIptuConfig, properties, userRole }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterUF, setFilterUF] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const currentYear = 2026; // Fixado em 2026 conforme solicitado pelo usuário

  const availableCities = React.useMemo(() => {
    const filtered = filterUF === 'all'
      ? properties
      : properties.filter(p => p.state === filterUF);
    const cities = filtered.map(p => p.city).filter(Boolean) as string[];
    return Array.from(new Set(cities)).sort();
  }, [properties, filterUF]);

  const availableUFs = React.useMemo(() => {
    const filtered = filterCity === 'all'
      ? properties
      : properties.filter(p => p.city === filterCity);
    const states = filtered.map(p => p.state).filter(Boolean) as string[];
    return Array.from(new Set(states)).sort();
  }, [properties, filterCity]);

  const availableOwners = React.useMemo(() => {
    const owners = properties.map(p => p.ownerName?.trim()).filter(Boolean) as string[];
    return Array.from(new Set(owners)).sort();
  }, [properties]);

  const availableTenants = React.useMemo(() => {
    const tenantsSet = new Set<string>();
    properties.forEach(p => {
      p.tenants?.forEach(t => {
        if (t.name) tenantsSet.add(t.name.trim());
      });
    });
    return Array.from(tenantsSet).sort();
  }, [properties]);

  const handleCityChange = (city: string) => {
    setFilterCity(city);
    if (city !== 'all') {
      const ufsForCity = properties
        .filter(p => p.city === city)
        .map(p => p.state);
      if (filterUF !== 'all' && !ufsForCity.includes(filterUF)) {
        setFilterUF('all');
      }
    }
  };

  const handleUFChange = (uf: string) => {
    setFilterUF(uf);
    if (uf !== 'all') {
      const citiesInUF = properties
        .filter(p => p.state === uf)
        .map(p => p.city);
      if (filterCity !== 'all' && !citiesInUF.includes(filterCity)) {
        setFilterCity('all');
      }
    }
  };

  const filteredProperties = properties.filter(p => {
    const searchTerm = search.toLowerCase();

    // Base fields
    const matchesBasic = p.name.toLowerCase().includes(searchTerm) ||
      p.address.toLowerCase().includes(searchTerm) ||
      p.registrationNumber.toLowerCase().includes(searchTerm) ||
      p.sequential.toLowerCase().includes(searchTerm) ||
      p.ownerName.toLowerCase().includes(searchTerm) ||
      p.registryOwner.toLowerCase().includes(searchTerm);

    // Tenant search
    const matchesTenants = p.tenants?.some(t => t.name.toLowerCase().includes(searchTerm));

    // Complex units search (if applicable)
    const matchesUnits = p.isComplex && p.units?.some(u =>
      u.registrationNumber?.toLowerCase().includes(searchTerm) ||
      u.sequential.toLowerCase().includes(searchTerm) ||
      u.ownerName?.toLowerCase().includes(searchTerm)
    );

    const matchesSearch = matchesBasic || matchesTenants || matchesUnits;
    const matchesType = filterType === 'all' ||
      (filterType === 'unico' && !p.isComplex) ||
      (filterType === 'complexo' && p.isComplex);
    const matchesCity = filterCity === 'all' || p.city === filterCity;
    const matchesUF = filterUF === 'all' || p.state === filterUF;
    const matchesOwner = filterOwner === 'all' || p.ownerName?.trim() === filterOwner;
    const matchesTenant = filterTenant === 'all' || p.tenants?.some(t => t.name?.trim() === filterTenant);

    // Filtro por status de pagamento
    const propertyStatus = getPropertyStatus(p, currentYear);
    const matchesPaymentStatus = filterPaymentStatus === 'all' || propertyStatus === filterPaymentStatus;

    return matchesSearch && matchesType && matchesCity && matchesUF && matchesOwner && matchesTenant && matchesPaymentStatus;
  });

  const canEdit = true; // Todo usuário autenticado pode editar
  const canDelete = true; // Botão de excluir agora visível para todos os cargos (regra de acesso tratada no clique)

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

      <div className="bg-white dark:bg-[#1a2634] p-5 rounded-2xl shadow-sm border border-[#e5e7eb] dark:border-[#2a3644] flex flex-col gap-5">
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#617289] dark:text-[#9ca3af] text-[20px]">search</span>
            <input
              type="text"
              placeholder="Busca rápida: nome, inscrição, sequencial, endereço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#e5e7eb] dark:border-[#2a3644] bg-gray-50/50 dark:bg-transparent text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[#111418] dark:text-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5 items-center bg-gray-50 dark:bg-[#22303e] p-1 rounded-xl border border-[#e5e7eb] dark:border-[#2a3644]">
              {[
                { id: 'all', label: 'TODOS' },
                { id: 'unico', label: 'IMÓVEL ÚNICO' },
                { id: 'complexo', label: 'COMPLEXO' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFilterType(type.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${filterType === type.id
                    ? 'bg-primary text-white shadow-md'
                    : 'text-[#617289] dark:text-[#9ca3af] hover:text-[#111418] dark:hover:text-white'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1 bg-gray-50 dark:bg-[#22303e] p-1 rounded-xl border border-[#e5e7eb] dark:border-[#2a3644]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${viewMode === 'grid'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-[#617289] dark:text-[#9ca3af] hover:text-[#111418] dark:hover:text-white'
                  }`}
              >
                <span className="material-symbols-outlined text-[18px] font-bold">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${viewMode === 'list'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-[#617289] dark:text-[#9ca3af] hover:text-[#111418] dark:hover:text-white'
                  }`}
              >
                <span className="material-symbols-outlined text-[18px] font-bold">format_list_bulleted</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-[#e5e7eb] dark:border-[#2a3644]">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#617289] dark:text-[#9ca3af] text-[18px]">location_city</span>
            <select
              value={filterCity}
              onChange={(e) => handleCityChange(e.target.value)}
              className="w-full h-11 pl-9 pr-10 rounded-xl border border-[#e5e7eb] dark:border-[#2a3644] bg-transparent text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[#111418] dark:text-white appearance-none cursor-pointer font-bold"
            >
              <option value="all">CIDADE: TODAS</option>
              {availableCities.map(city => (
                <option key={city} value={city}>{city.toUpperCase()}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#617289] pointer-events-none">expand_more</span>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#617289] dark:text-[#9ca3af] text-[18px]">map</span>
            <select
              value={filterUF}
              onChange={(e) => handleUFChange(e.target.value)}
              className="size-full h-11 pl-9 pr-10 rounded-xl border border-[#e5e7eb] dark:border-[#2a3644] bg-transparent text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[#111418] dark:text-white appearance-none cursor-pointer font-bold"
            >
              <option value="all">UF: TODOS</option>
              {availableUFs.map(uf => (
                <option key={uf} value={uf}>{uf.toUpperCase()}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#617289] pointer-events-none">expand_more</span>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#617289] dark:text-[#9ca3af] text-[18px]">person</span>
            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="size-full h-11 pl-9 pr-10 rounded-xl border border-[#e5e7eb] dark:border-[#2a3644] bg-transparent text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[#111418] dark:text-white appearance-none cursor-pointer font-bold"
            >
              <option value="all">PROPRIETÁRIO: TODOS</option>
              {availableOwners.map(owner => (
                <option key={owner} value={owner}>{owner.toUpperCase()}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#617289] pointer-events-none">expand_more</span>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#617289] dark:text-[#9ca3af] text-[18px]">group</span>
            <select
              value={filterTenant}
              onChange={(e) => setFilterTenant(e.target.value)}
              className="size-full h-11 pl-9 pr-10 rounded-xl border border-[#e5e7eb] dark:border-[#2a3644] bg-transparent text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[#111418] dark:text-white appearance-none cursor-pointer font-bold"
            >
              <option value="all">LOCATÁRIO: TODOS</option>
              {availableTenants.map(tenant => (
                <option key={tenant} value={tenant}>{tenant.toUpperCase()}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#617289] pointer-events-none">expand_more</span>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#617289] dark:text-[#9ca3af] text-[18px]">payments</span>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="size-full h-11 pl-9 pr-10 rounded-xl border border-[#e5e7eb] dark:border-[#2a3644] bg-transparent text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[#111418] dark:text-white appearance-none cursor-pointer font-bold"
            >
              <option value="all">STATUS: TODOS</option>
              <option value={IptuStatus.PAID}>PAGO</option>
              <option value={IptuStatus.IN_PROGRESS}>EM ANDAMENTO</option>
              <option value={IptuStatus.PENDING}>PENDENTE</option>
              <option value={IptuStatus.OPEN}>EM ABERTO</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#617289] pointer-events-none">expand_more</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end px-1">
        <div className="flex items-center gap-2 bg-gray-50/50 dark:bg-[#1a2634]/50 px-3 py-1.5 rounded-lg border border-[#e5e7eb] dark:border-[#2a3644] group hover:border-primary/50 transition-colors">
          <span className="material-symbols-outlined text-[18px] text-primary">data_usage</span>
          <span className="text-[11px] font-bold text-[#617289] dark:text-[#9ca3af]">
            <span className="text-primary">{filteredProperties.length}</span> de <span className="text-[#111418] dark:text-white">{properties.length}</span> imóveis exibidos
          </span>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
          {filteredProperties.map(property => {
            const currentYearStatus = getPropertyStatus(property, currentYear);
            const showDebtsBadge = hasPreviousDebts(property, currentYear);

            return (
              <div key={property.id} className="bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group flex flex-col">
                <div className="relative h-36" onClick={() => onSelectProperty(property.id)}>
                  <img src={property.imageUrl} alt={property.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute top-3 right-3 animate-in fade-in zoom-in duration-500">
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm ${currentYearStatus === IptuStatus.PAID ? 'bg-emerald-500 text-white' :
                        currentYearStatus === IptuStatus.OPEN ? 'bg-red-500 text-white' : 'bg-primary text-white'
                        }`}>{currentYearStatus}</span>
                      {showDebtsBadge && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm bg-red-600 text-white flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">warning</span>
                          DÉBITOS
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
                    <div className="flex gap-1.5 self-end">
                      {canEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditProperty(property); }}
                          className="size-7 flex items-center justify-center rounded-lg bg-white/90 text-[#111418] hover:bg-white transition-all shadow-md backdrop-blur-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteProperty(property.id); }}
                          className="size-7 flex items-center justify-center rounded-lg bg-red-500/80 text-white hover:bg-red-600 transition-all shadow-md backdrop-blur-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
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
                  <p className="text-[10px] font-bold text-primary mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">pincode</span>
                    {(() => {
                      const count = new Set(property.units.filter(u => u.year === currentYear).map(u => u.sequential)).size;
                      return `${count} ${count === 1 ? 'Sequencial' : 'Sequenciais'}`;
                    })()}
                  </p>

                  {/* Locatários no Card */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {property.tenants.filter(t => t.year === currentYear).length > 0 ? (
                      property.tenants.filter(t => t.year === currentYear).slice(0, 3).map((t, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800/50 text-[#617289] dark:text-[#9ca3af] text-[9px] font-bold rounded border border-gray-100 dark:border-gray-700 truncate max-w-[100px]" title={t.name}>
                          {t.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 italic">Disponível</span>
                    )}
                    {property.tenants.filter(t => t.year === currentYear).length > 3 && (
                      <span className="text-[9px] font-bold text-primary">+{property.tenants.filter(t => t.year === currentYear).length - 3}</span>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#2a3644] flex justify-between items-center">
                    <div className="flex items-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenIptuConfig(property, 'newCharge'); }}
                        className="h-8 px-3 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md text-[9px] font-bold uppercase tracking-tight"
                        title="Configurar Sequenciais e Locatários"
                      >
                        <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                        NOVO IPTU
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
                  const currentYearStatus = getPropertyStatus(property, currentYear);
                  const showDebtsBadge = hasPreviousDebts(property, currentYear);

                  return (
                    <tr key={property.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => onSelectProperty(property.id)}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[#111418] dark:text-white">{property.name}</span>
                          <span className="text-[12px] text-[#617289] dark:text-[#9ca3af] mt-0.5 line-clamp-1">{property.address}</span>
                          <span className="text-[11px] text-[#94a3b8] dark:text-[#64748b] mt-0.5 flex flex-wrap items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">location_on</span>
                            {property.city} - {property.state}
                            <span className="mx-1 opacity-20">|</span>
                            <span className="font-bold text-primary flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">pincode</span>
                              {(() => {
                                const count = new Set(property.units.filter(u => u.year === currentYear).map(u => u.sequential)).size;
                                return `${count} ${count === 1 ? 'Seq.' : 'Seqs.'}`;
                              })()}
                            </span>
                            <span className="mx-1 opacity-20">|</span>
                            <div className="flex flex-wrap gap-1 items-center">
                              {property.tenants.filter(t => t.year === currentYear).length > 0 ? (
                                property.tenants.filter(t => t.year === currentYear).map((t, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 bg-white dark:bg-gray-800 text-[#617289] dark:text-[#9ca3af] text-[9px] font-bold rounded border border-gray-100 dark:border-gray-700">
                                    {t.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 italic">Disponível</span>
                              )}
                            </div>
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
                          {showDebtsBadge && (
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
                            onClick={(e) => { e.stopPropagation(); onOpenIptuConfig(property, 'newCharge'); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100"
                          >
                            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                            NOVO IPTU
                          </button>
                          {(canEdit || canDelete) && (
                            <div className="flex gap-1 border-l border-gray-100 dark:border-gray-700 pl-3 ml-1">
                              {canEdit && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onEditProperty(property); }}
                                  className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteProperty(property.id); }}
                                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                              )}
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
      )
      }
    </div >
  );
};

export default PropertyListView;
