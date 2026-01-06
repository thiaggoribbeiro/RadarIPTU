
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
import { supabase } from './lib/supabase';

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
  const [iptuConfigInitialSection, setIptuConfigInitialSection] = useState<'units' | 'tenants' | undefined>(undefined);
  const [iptuConfigInitialYear, setIptuConfigInitialYear] = useState<number | undefined>(undefined);
  const [iptuConfigInitialSequential, setIptuConfigInitialSequential] = useState<string | undefined>(undefined);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<UserRole>('Usuário');

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
        .order('created_at', { ascending: false });

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
          imageUrl: item.image_url || `https://picsum.photos/seed/${item.id}/400/400`,
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

        if (session.user.user_metadata?.must_change_password) {
          setIsChangePasswordModalOpen(true);
        }

        fetchProperties();
      } else {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLoginSuccess = async (name: string, email: string, demo: boolean = false, mustChange: boolean = false) => {
    setIsLoggedIn(true);
    setIsDemoMode(demo);
    setUserName(name);
    setUserEmail(email);

    if (email.toLowerCase() === 'thiago.ribeiro@avesta.com.br' || demo) {
      setUserRole('Administrador');
    } else {
      setUserRole('Usuário');
    }

    if (mustChange) setIsChangePasswordModalOpen(true);
    setCurrentView('dashboard');
    fetchProperties(demo);
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
            onDeleteProperty={async (id) => {
              if (confirm('Excluir imóvel?')) {
                const { error } = await supabase.from('properties').delete().eq('id', id);
                if (!error) fetchProperties();
              }
            }}
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
      </main>

      {selectedPropertyId && properties.find(p => p.id === selectedPropertyId) && (
        <PropertyDetailModal
          property={properties.find(p => p.id === selectedPropertyId)!}
          userRole={userRole}
          onClose={() => setSelectedPropertyId(null)}
          onAddIptu={async (pid, data) => {
            const target = properties.find(p => p.id === pid);
            if (target) {
              const historyIndex = target.iptuHistory.findIndex(h => h.id === data.id);
              let newHistory = [...target.iptuHistory];
              if (historyIndex > -1) newHistory[historyIndex] = data;
              else newHistory = [data, ...newHistory].sort((a, b) => b.year - a.year);

              const { error } = await supabase.from('properties').update({ iptu_history: newHistory, last_updated: new Date().toLocaleDateString('pt-BR') }).eq('id', pid);
              if (!error) fetchProperties();
            }
          }}
          onDeleteIptu={async (pid, iptuId) => {
            const target = properties.find(p => p.id === pid);
            if (target && confirm(`Excluir este lançamento de IPTU?`)) {
              const newHistory = target.iptuHistory.filter(h => h.id !== iptuId);
              const { error } = await supabase.from('properties').update({ iptu_history: newHistory }).eq('id', pid);
              if (!error) fetchProperties();
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
    </div>
  );
};

export default App;
