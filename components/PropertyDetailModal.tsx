
import React, { useState } from 'react';
import { Property, IptuStatus, IptuRecord, PaymentMethod, UserRole } from '../types';
import { getDynamicStatus, formatDate } from '../utils/iptu';
import AddIptuModal from './AddIptuModal';
import IptuDetailModal from './IptuDetailModal';

interface PropertyDetailModalProps {
  property: Property;
  userRole: UserRole;
  onClose: () => void;
  onAddIptu: (propertyId: string, newIptu: IptuRecord) => void;
  onDeleteIptu: (propertyId: string, year: number) => void;
}

const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({ property, userRole, onClose, onAddIptu, onDeleteIptu }) => {
  const [isAddIptuOpen, setIsAddIptuOpen] = useState(false);
  const [selectedIptuDetails, setSelectedIptuDetails] = useState<IptuRecord | null>(null);
  const [iptuToEdit, setIptuToEdit] = useState<IptuRecord | null>(null);

  const canDelete = userRole === 'Gestor' || userRole === 'Administrador';


  const handleEditIptu = (iptu: IptuRecord) => {
    setIptuToEdit(iptu);
    setSelectedIptuDetails(null);
    setIsAddIptuOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="bg-white dark:bg-[#1a2634] w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2a3644] overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-8 py-5 border-b-4 border-primary bg-gray-50 dark:bg-[#1e2a3b]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
              <span className="material-symbols-outlined">apartment</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#111418] dark:text-white uppercase tracking-tight">{property.name}</h2>
              <p className="text-xs font-semibold text-[#617289] dark:text-[#9ca3af]">Inscrição: {property.registrationNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="size-10 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined text-[#111418] dark:text-white font-semibold text-[24px]">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col md:flex-row gap-6 p-6 bg-gray-50 dark:bg-[#1e2a3b] rounded-2xl border border-gray-100 dark:border-[#2a3644]">
              <img src={property.imageUrl} alt={property.name} className="w-full md:w-56 h-56 object-cover rounded-xl shadow-md border-2 border-white dark:border-gray-700" />
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-[#111418] dark:text-white uppercase">Localização</h3>
                  <p className="text-[#617289] dark:text-[#9ca3af] flex items-center gap-1 mt-1 font-medium">
                    <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
                    {property.address}, {property.neighborhood}
                  </p>
                  <p className="text-[#617289] dark:text-[#9ca3af] ml-6 font-medium">{property.city} - {property.state}, CEP {property.zipCode}</p>
                  <div className="flex gap-2 mt-4">
                    <span className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-bold uppercase">
                      {property.type}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${property.possession === 'Grupo' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      Posse: {property.possession}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1e2a3b] p-6 rounded-2xl border border-gray-100 dark:border-[#2a3644] shadow-sm">
              <h4 className="text-sm font-bold text-[#111418] dark:text-primary uppercase tracking-wider flex items-center gap-2 mb-6 border-b-2 border-primary/50 pb-2">
                <span className="material-symbols-outlined font-semibold">assignment</span>
                Dados do Imóvel
              </h4>
              <div className="space-y-3">
                {[
                  { label: 'Proprietário', value: property.ownerName },
                  { label: 'Cadastro Imob.', value: property.registryOwner },
                  { label: 'Inscrição', value: property.registrationNumber },
                  { label: 'Sequencial', value: property.sequential },
                  { label: 'Área Terreno', value: `${property.landArea} m²` },
                  { label: 'Área Const.', value: `${property.builtArea} m²` },
                  { label: 'V. Venal', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.appraisalValue) },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col border-b border-gray-100 dark:border-gray-700/50 pb-2 last:border-0">
                    <span className="text-[9px] font-bold text-[#617289] uppercase tracking-tighter">{item.label}</span>
                    <span className="text-sm font-bold text-[#111418] dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#111418] dark:text-white flex items-center gap-2 uppercase tracking-tight">
                <span className="material-symbols-outlined text-primary font-semibold">history</span> Histórico de IPTU
              </h3>
              <button
                onClick={() => { setIptuToEdit(null); setIsAddIptuOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-[#a64614] rounded-xl text-sm font-bold transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-[18px] font-semibold">add</span>
                NOVO IPTU
              </button>
            </div>

            <div className="bg-white dark:bg-[#1a2634] border border-gray-100 dark:border-[#2a3644] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-[#1e2a3b] border-b-2 border-primary">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase text-[#111418] dark:text-[#9ca3af]">Ano</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase text-[#111418] dark:text-[#9ca3af]">Detalhamento</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase text-[#111418] dark:text-[#9ca3af]">Valor Total</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase text-[#111418] dark:text-[#9ca3af]">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase text-[#111418] dark:text-[#9ca3af] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {property.iptuHistory.length > 0 ? property.iptuHistory.map((iptu, idx) => {
                    const status = getDynamicStatus(iptu);
                    return (
                      <tr key={idx} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold">{iptu.year}</td>
                        <td className="px-6 py-4">
                          {iptu.chosenMethod === 'Parcelado' ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-secondary">Parcelado ({iptu.installmentsCount}x)</span>
                              <span className="text-[10px] font-semibold text-[#617289] dark:text-[#9ca3af]">Início: {formatDate(iptu.startDate)}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-emerald-600">Cota Única</span>
                              <span className="text-[10px] font-semibold text-[#617289] dark:text-[#9ca3af]">Pago: {formatDate(iptu.startDate)}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-[#111418] dark:text-white">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(iptu.value)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === IptuStatus.PAID ? 'bg-emerald-100 text-emerald-700' :
                            status === IptuStatus.IN_PAYMENT ? 'bg-blue-100 text-blue-700' :
                              'bg-primary/20 text-[#111418] dark:text-primary'
                            }`}>
                            <span className={`size-1.5 rounded-full ${status === IptuStatus.PAID ? 'bg-emerald-500' :
                              status === IptuStatus.IN_PAYMENT ? 'bg-blue-500' : 'bg-primary'
                              }`}></span>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canDelete && (
                              <button
                                onClick={() => onDeleteIptu(property.id, iptu.year)}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedIptuDetails(iptu)}
                              className="px-3 py-1 text-[11px] font-bold uppercase text-white bg-primary hover:bg-[#a64614] rounded-lg transition-all shadow-sm"
                            >
                              Detalhes
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-[#617289] font-semibold">Sem histórico de IPTU registrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

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

      {selectedIptuDetails && (
        <IptuDetailModal
          iptu={selectedIptuDetails}
          property={property}
          onClose={() => setSelectedIptuDetails(null)}
          onEdit={() => handleEditIptu(selectedIptuDetails)}
        />
      )}
    </div>
  );
};

export default PropertyDetailModal;
