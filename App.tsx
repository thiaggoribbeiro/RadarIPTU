
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ViewType, Property, IptuRecord, UserRole } from './types';
import { mockProperties as fallbackMock } from './mockData';
import Login from './components/Login';
import DashboardView from './components/DashboardView';
import PropertyListView from './components/PropertyListView';
import PropertyDetailModal from './components/PropertyDetailModal';
import ProfileModal from './components/ProfileModal';
import AddPropertyModal from './components/AddPropertyModal';
import ReportsView from './components/ReportsView';
import ChangePasswordModal from './components/ChangePasswordModal';
import Navbar from './components/Navbar';
import IptuConfigModal from './components/IptuConfigModal';
import GerenciamentoView from './components/GerenciamentoView';
import AuditLogsView from './components/AuditLogsView';
import { createClient } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { logAction } from './lib/auditLogger';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState<boolean>(false);
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);
  const [isIptuConfigModalOpen, setIsIptuConfigModalOpen] = useState<boolean>(false);
  const [propertyForConfig, setPropertyForConfig] = useState<Property | null>(null);
  const [iptuConfigInitialSection, setIptuConfigInitialSection] = useState<'units' | 'tenants' | 'newCharge' | undefined>(undefined);
  const [iptuConfigInitialYear, setIptuConfigInitialYear] = useState<number | undefined>(undefined);
  const [iptuConfigInitialSequential, setIptuConfigInitialSequential] = useState<string | undefined>(undefined);
  const [showRestrictedAccess, setShowRestrictedAccess] = useState<boolean>(false);
  const [propertyIdToDelete, setPropertyIdToDelete] = useState<string | null>(null);
  const [availableManagers, setAvailableManagers] = useState<{ name: string, email: string }[]>([]);
  const [overrideEmail, setOverrideEmail] = useState<string>('');
  const [overridePassword, setOverridePassword] = useState<string>('');
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [isVerifyingOverride, setIsVerifyingOverride] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<UserRole>('Usuário');
  const [isAdminOverride, setIsAdminOverride] = useState<boolean>(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const fetchProperties = async (demo: boolean = false) => {
    if (demo) {
      const saved = localStorage.getItem('radiptu_properties');
      setProperties(saved ? JSON.parse(saved) : fallbackMock);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('address', { ascending: true });

      if (error) throw error;

      if (data) {
        const mappedData: Property[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          address: item.address,
          neighborhood: item.neighborhood,
          city: item.city,
          state: item.state,
          zipCode: item.zip_code || '',
          ownerName: item.owner_name || '',
          registryOwner: item.registry_owner || '',
          possession: item.possession || 'Grupo',
          registrationNumber: item.registration_number || '',
          sequential: item.sequential || '',
          isComplex: item.is_complex || false,
          units: item.units || [],
          landArea: item.land_area || 0,
          builtArea: item.built_area || 0,
          type: item.type || 'Apartamento',
          appraisalValue: item.appraisal_value || 0,
          baseYear: item.base_year || new Date().getFullYear(),
          lastUpdated: item.last_updated || new Date().toLocaleDateString('pt-BR'),
          imageUrl: item.image_url || '/assets/default-property.png',
          tenants: item.tenants || [],
          iptuHistory: item.iptu_history || []
        }));
        setProperties(mappedData);
        localStorage.setItem('radiptu_properties', JSON.stringify(mappedData));
      }
    } catch (err: any) {
      console.warn('Sync limitado:', err.message);
      const saved = localStorage.getItem('radiptu_properties');
      setProperties(saved ? JSON.parse(saved) : fallbackMock);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      // Busca apenas gestores para a lista de nomes (usando ilike para ignorar capitalização)
      const { data, error } = await supabase
        .from('users')
        .select('full_name, email')
        .ilike('role', 'Gestor')
        .neq('status', 'Inativo')
        .order('full_name');

      if (data) {
        setAvailableManagers(data.map(m => ({ name: m.full_name, email: m.email })));
      }
    } catch (err) {
      console.error('Erro ao buscar gestores:', err);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const email = session.user.email || '';
        const name = session.user.user_metadata?.full_name || 'Usuário';
        const roleInMetadata = session.user.user_metadata?.role;

        const isAdminEmail = email.toLowerCase() === 'thiago.ribeiro@avesta.com.br';
        const finalRole = isAdminEmail ? 'Administrador' : (roleInMetadata || 'Usuário');

        setIsLoggedIn(true);
        setUserEmail(email);
        setUserName(name);
        setUserRole(finalRole as UserRole);

        // Check if user must change password from the public 'users' table
        const { data: userData } = await supabase
          .from('users')
          .select('must_change_password')
          .eq('id', session.user.id)
          .single();

        if (session.user.user_metadata?.must_change_password || userData?.must_change_password) {
          setIsChangePasswordModalOpen(true);
        }

        fetchProperties();
        fetchManagers();
      } else {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLoginSuccess = async (name: string, email: string, role?: string, demo: boolean = false, mustChange: boolean = false) => {
    setIsLoggedIn(true);
    setIsDemoMode(demo);
    setUserName(name);
    setUserEmail(email);

    if (email.toLowerCase() === 'thiago.ribeiro@avesta.com.br' || demo) {
      setUserRole('Administrador');
    } else if (role) {
      setUserRole(role as UserRole);
    } else {
      setUserRole('Usuário');
    }

    if (mustChange) setIsChangePasswordModalOpen(true);
    else {
      // Direct check for forced change even on fresh login (for existing users)
      const { data: userData } = await supabase
        .from('users')
        .select('must_change_password')
        .eq('email', email)
        .single();

      if (userData?.must_change_password) {
        setIsChangePasswordModalOpen(true);
      }
    }
    setCurrentView('dashboard');
    fetchProperties(demo);
    fetchManagers();
    logAction('Login', demo ? 'Entrou em modo demonstração' : `Acesso realizado com sucesso - Cargo: ${role || 'Usuário'}`);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = async () => {
    if (!isDemoMode) await supabase.auth.signOut();
    setIsLoggedIn(false);
    setIsDemoMode(false);
    setIsProfileMenuOpen(false);
  };

  const handleDeleteProperty = async (id: string) => {
    // Agora todos os perfis (Usuário, Gestor, Administrador) precisam de confirmação via modal
    setPropertyIdToDelete(id);
    setShowRestrictedAccess(true);
    setOverrideError(null);
    setOverrideEmail('');
    setOverridePassword('');
    setIsAdminOverride(false);
  };

  const handleManagerOverride = async () => {
    if (!overrideEmail || !overridePassword) {
      setOverrideError('Selecione um gestor e digite a senha.');
      return;
    }

    setIsVerifyingOverride(true);
    setOverrideError(null);

    try {
      // Create an independent client for verification
      const tempSupabase = createClient(
        (import.meta as any).env?.VITE_SUPABASE_URL || 'https://aqwuxqfsxnzfyhvjvugu.supabase.co',
        (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxd3V4cWZzeG56Znlodmp2dWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTA5MTgsImV4cCI6MjA4MTc4NjkxOH0.YyR9T2DS5vgbIVid1mb7dAqXgh_a8TRnJPqGrfzlOb0'
      );

      const { data, error } = await tempSupabase.auth.signInWithPassword({
        email: overrideEmail,
        password: overridePassword,
      });

      if (error) {
        setOverrideError('Senha incorreta para o gestor selecionado.');
        return;
      }

      const email = data.user?.email?.toLowerCase();
      const roleFromMetadata = data.user?.user_metadata?.role?.toLowerCase();
      const isAdminEmail = email === 'thiago.ribeiro@avesta.com.br';
      const role = isAdminEmail ? 'administrador' : roleFromMetadata;

      const managerName = data.user?.user_metadata?.full_name || overrideEmail;

      if (role !== 'gestor' && role !== 'administrador') {
        setOverrideError('Este usuário não possui cargo de Gestor ou Administrador.');
        return;
      }

      // If authorized, proceed with deletion
      if (propertyIdToDelete) {
        const p = properties.find(prop => prop.id === propertyIdToDelete);
        const { error: deleteError } = await supabase.from('properties').delete().eq('id', propertyIdToDelete);

        if (!deleteError) {
          fetchProperties();
          logAction('Exclusão de Imóvel (Override)', `Imóvel: ${p?.name || propertyIdToDelete} | Autorizado por: ${managerName}`);
          setSelectedPropertyId(null);
          setPropertyIdToDelete(null);
          setShowRestrictedAccess(false);
          setOverrideEmail('');
          setOverridePassword('');
          setIsAdminOverride(false);
          alert('Imóvel excluído com sucesso!');
        } else {
          setOverrideError('Erro ao excluir o imóvel no banco de dados.');
        }
      }
    } catch (err) {
      setOverrideError('Erro durante a verificação de segurança.');
    } finally {
      setIsVerifyingOverride(false);
    }
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark transition-colors duration-200 font-display">
      {loading && (
        <div className="fixed top-0 left-0 w-full h-1 z-[100] overflow-hidden bg-primary/20">
          <div className="h-full bg-primary animate-progress-indeterminate w-1/2"></div>
        </div>
      )}


      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        isProfileMenuOpen={isProfileMenuOpen}
        setIsProfileMenuOpen={setIsProfileMenuOpen}
        onOpenProfile={() => { setIsProfileModalOpen(true); setIsProfileMenuOpen(false); }}
        onLogout={handleLogout}
        isDemoMode={isDemoMode}
      />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-8 relative">
        {currentView === 'dashboard' && <DashboardView onSelectProperty={(id) => setSelectedPropertyId(id)} properties={properties} onAddProperty={() => setIsAddPropertyModalOpen(true)} />}
        {currentView === 'properties' && (
          <PropertyListView
            onSelectProperty={(id) => setSelectedPropertyId(id)}
            properties={properties}
            onAddProperty={() => setIsAddPropertyModalOpen(true)}
            onEditProperty={(p) => {
              setPropertyToEdit(p);
              setIsAddPropertyModalOpen(true);
            }}
            onDeleteProperty={handleDeleteProperty}
            onOpenIptuConfig={(p, section, year, sequential) => {
              setPropertyForConfig(p);
              setIptuConfigInitialSection(section);
              setIptuConfigInitialYear(year);
              setIptuConfigInitialSequential(sequential);
              setIsIptuConfigModalOpen(true);
            }}
            userRole={userRole}
          />
        )}
        {currentView === 'reports' && <ReportsView properties={properties} />}
        {currentView === 'team' && <GerenciamentoView userRole={userRole} />}
        {currentView === 'audit' && <AuditLogsView userRole={userRole} />}
      </main>

      {selectedPropertyId && properties.find(p => p.id === selectedPropertyId) && (
        <PropertyDetailModal
          property={properties.find(p => p.id === selectedPropertyId)!}
          userRole={userRole}
          onClose={() => setSelectedPropertyId(null)}
          onEditProperty={(p) => {
            setPropertyToEdit(p);
            setIsAddPropertyModalOpen(true);
            setSelectedPropertyId(null);
          }}
          onDeleteProperty={handleDeleteProperty}
          onAddIptu={async (pid, data) => {
            const target = properties.find(p => p.id === pid);
            if (target) {
              const historyIndex = target.iptuHistory.findIndex(h => h.id === data.id);
              let newHistory = [...target.iptuHistory];
              if (historyIndex > -1) newHistory[historyIndex] = data;
              else newHistory = [data, ...newHistory].sort((a, b) => b.year - a.year);

              const { error } = await supabase.from('properties').update({ iptu_history: newHistory, last_updated: new Date().toLocaleDateString('pt-BR') }).eq('id', pid);
              if (!error) {
                fetchProperties();
                logAction('Lançamento de IPTU', `Imóvel: ${target.name}, Ano: ${data.year}, Valor: R$ ${data.value.toLocaleString('pt-BR')}`);
              }
            }
          }}
          onDeleteIptu={async (pid, iptuId) => {
            const target = properties.find(p => p.id === pid);
            const iptu = target?.iptuHistory.find(h => h.id === iptuId);
            if (target && confirm(`Excluir este lançamento de IPTU?`)) {
              const newHistory = target.iptuHistory.filter(h => h.id !== iptuId);
              const { error } = await supabase.from('properties').update({ iptu_history: newHistory }).eq('id', pid);
              if (!error) {
                fetchProperties();
                logAction('Exclusão de IPTU', `Imóvel: ${target.name}, Ano: ${iptu?.year}`);
              }
            }
          }}
          onOpenIptuConfig={(p, section, year, sequential) => {
            setPropertyForConfig(p);
            setIptuConfigInitialSection(section);
            setIptuConfigInitialYear(year);
            setIptuConfigInitialSequential(sequential);
            setIsIptuConfigModalOpen(true);
          }}
        />
      )}
      {isProfileModalOpen && <ProfileModal userName={userName} userEmail={userEmail} userRole={userRole} onClose={() => setIsProfileModalOpen(false)} />}
      {isAddPropertyModalOpen && (
        <AddPropertyModal
          onClose={() => { setIsAddPropertyModalOpen(false); setPropertyToEdit(null); }}
          onCancel={() => { setIsAddPropertyModalOpen(false); setPropertyToEdit(null); }}
          initialData={propertyToEdit || undefined}
          onSubmit={async (p, imageFile) => {
            setLoading(true);
            try {
              let finalImageUrl = p.imageUrl;

              if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${p.id}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                  .from('properties')
                  .upload(filePath, imageFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                  .from('properties')
                  .getPublicUrl(filePath);

                finalImageUrl = publicUrl;
              }

              if (propertyToEdit) {
                // Modo Edição
                const { error: updateError } = await supabase.from('properties').update({
                  name: p.name,
                  address: p.address,
                  neighborhood: p.neighborhood,
                  city: p.city,
                  state: p.state,
                  zip_code: p.zipCode,
                  owner_name: p.ownerName,
                  registry_owner: p.registryOwner,
                  possession: p.possession,
                  registration_number: p.registrationNumber,
                  sequential: p.sequential,
                  is_complex: p.isComplex,
                  units: p.units,
                  land_area: p.landArea,
                  built_area: p.builtArea,
                  type: p.type,
                  appraisal_value: p.appraisalValue,
                  base_year: p.baseYear,
                  tenants: p.tenants,
                  last_updated: p.lastUpdated,
                  image_url: finalImageUrl
                }).eq('id', p.id);

                if (updateError) throw updateError;
                logAction('Atualização de Imóvel', `Nome: ${p.name}, Endereço: ${p.address}`);
              } else {
                // Modo Inserção
                const { error: insertError } = await supabase.from('properties').insert([{
                  id: p.id,
                  name: p.name,
                  address: p.address,
                  neighborhood: p.neighborhood,
                  city: p.city,
                  state: p.state,
                  zip_code: p.zipCode,
                  owner_name: p.ownerName,
                  registry_owner: p.registryOwner,
                  possession: p.possession,
                  registration_number: p.registrationNumber,
                  sequential: p.sequential,
                  is_complex: p.isComplex,
                  units: p.units,
                  land_area: p.landArea,
                  built_area: p.builtArea,
                  type: p.type,
                  appraisal_value: p.appraisalValue,
                  base_year: p.baseYear,
                  tenants: p.tenants,
                  last_updated: p.lastUpdated,
                  image_url: finalImageUrl,
                  iptu_history: p.iptuHistory
                }]);

                if (insertError) throw insertError;
                logAction('Novo Imóvel', `Nome: ${p.name}, Endereço: ${p.address}`);
              }

              fetchProperties();
              setIsAddPropertyModalOpen(false);
              setPropertyToEdit(null);
            } catch (err: any) {
              console.error('Erro ao salvar imóvel:', err.message);
              alert('Erro ao salvar imóvel: ' + err.message);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
      {isIptuConfigModalOpen && propertyForConfig && (
        <IptuConfigModal
          property={propertyForConfig}
          initialSection={iptuConfigInitialSection}
          initialYear={iptuConfigInitialYear}
          initialSequential={iptuConfigInitialSequential}
          onClose={() => {
            setIsIptuConfigModalOpen(false);
            setPropertyForConfig(null);
            setIptuConfigInitialSection(undefined);
            setIptuConfigInitialYear(undefined);
            setIptuConfigInitialSequential(undefined);
          }}
          onSubmit={async (propertyId, units, tenants, baseYear) => {
            setLoading(true);
            try {
              const { error } = await supabase
                .from('properties')
                .update({
                  units,
                  tenants,
                  base_year: baseYear,
                  last_updated: new Date().toLocaleDateString('pt-BR')
                })
                .eq('id', propertyId);

              if (error) throw error;

              fetchProperties();
              setIsIptuConfigModalOpen(false);
              setPropertyForConfig(null);
              logAction('Configuração de IPTU', `Imóvel: ${propertyForConfig?.name}, Ano Base: ${baseYear}`);
            } catch (err: any) {
              console.error('Erro ao configurar IPTU:', err.message);
              alert('Erro ao configurar IPTU: ' + err.message);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
      {isChangePasswordModalOpen && <ChangePasswordModal onClose={() => setIsChangePasswordModalOpen(false)} />}

      {showRestrictedAccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1a2634] w-full max-w-md rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-[#2a3644] text-center animate-in zoom-in-95 duration-300">
            <div className="size-16 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">lock</span>
            </div>
            <h3 className="text-xl font-bold text-[#111418] dark:text-white mb-2 tracking-tight">Confirmar Exclusão</h3>
            <p className="text-sm text-[#617289] dark:text-[#9ca3af] mb-8 leading-relaxed">
              Esta ação é permanente. Para excluir este imóvel, selecione um <strong>gestor</strong> responsável ou autorize como <strong>administrador</strong>.
            </p>

            <div className="space-y-4 mb-8 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-[#617289] dark:text-[#9ca3af] ml-1">Autorizador</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] pointer-events-none">person</span>
                  {!isAdminOverride ? (
                    <select
                      value={overrideEmail}
                      onChange={(e) => {
                        if (e.target.value === '__ADMIN__') {
                          setIsAdminOverride(true);
                          setOverrideEmail('');
                        } else {
                          setOverrideEmail(e.target.value);
                        }
                      }}
                      className="w-full h-12 pl-10 pr-10 rounded-xl border border-[#e5e7eb] dark:border-[#2a3644] bg-gray-50 dark:bg-[#22303e] text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[#111418] dark:text-white transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled className="dark:bg-[#1a2634]">Selecione um gestor...</option>
                      {availableManagers.map(manager => (
                        <option key={manager.email} value={manager.email} className="dark:bg-[#1a2634]">
                          {manager.name}
                        </option>
                      ))}
                      <option value="__ADMIN__" className="dark:bg-[#1a2634] font-bold text-primary">--- Sou Administrador ---</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        autoFocus
                        placeholder="E-mail do Administrador"
                        value={overrideEmail}
                        onChange={(e) => setOverrideEmail(e.target.value)}
                        className="flex-1 h-12 pl-10 pr-4 rounded-xl border border-primary bg-primary/5 text-sm focus:ring-1 focus:ring-primary outline-none text-[#111418] dark:text-white transition-all"
                      />
                      <button
                        onClick={() => { setIsAdminOverride(false); setOverrideEmail(''); }}
                        className="px-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-primary transition-colors"
                        title="Voltar para lista"
                      >
                        <span className="material-symbols-outlined">undo</span>
                      </button>
                    </div>
                  )}
                  {!isAdminOverride && (
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] pointer-events-none select-none">
                      expand_more
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-[#617289] dark:text-[#9ca3af] ml-1">Senha do Gestor/Adm</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">key</span>
                  <input
                    type="password"
                    placeholder="Digite sua senha"
                    value={overridePassword}
                    onChange={(e) => setOverridePassword(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#e5e7eb] dark:border-[#2a3644] bg-gray-50 dark:bg-transparent text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[#111418] dark:text-white transition-all"
                  />
                </div>
              </div>

              {overrideError && (
                <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 py-2 rounded-lg text-center px-2">{overrideError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRestrictedAccess(false)}
                className="flex-1 h-12 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleManagerOverride}
                disabled={isVerifyingOverride}
                className="flex-1 h-12 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/30 hover:bg-[#a64614] transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isVerifyingOverride ? (
                  <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
