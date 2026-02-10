
export enum IptuStatus {
  OPEN = 'Aberto',
  IN_ANALYSIS = 'Em análise',
  IN_PROGRESS = 'Em andamento',
  LAUNCHED = 'Lançado',
  PAID = 'Pago',
  PENDING = 'Pendente',
  UNDEFINED = 'Indefinido'
}

export type PaymentMethod = 'Cota Única' | 'Parcelado' | 'Indefinido';

export interface IptuRecord {
  id: string;
  year: number;
  singleValue?: number;
  installmentValue?: number;
  installmentsCount?: number;
  chosenMethod?: PaymentMethod;
  holmesCompany?: string;
  startDate?: string;
  dueDate?: string;
  status: IptuStatus;
  value: number;
  receiptUrl?: string;
  selectedSequentials?: string[];
  iptuNotAvailable?: boolean;
}

export type PropertyType = 'Loja' | 'Galpão' | 'Terreno' | 'Sala' | 'Apartamento' | 'Casa' | 'Industrial' | 'Comercial' | 'Residencial' | 'Prédio Comercial' | 'Sala Comercial';

export interface PropertyUnit {
  registrationNumber?: string;
  sequential: string;
  address?: string;
  ownerName?: string;
  registryOwner?: string;
  landArea?: number;
  builtArea?: number;
  singleValue: number;
  installmentValue: number;
  installmentsCount: number;
  year: number;
  chosenMethod: PaymentMethod;
  status: IptuStatus;
  hasWasteTax?: boolean;
  wasteTaxValue?: number;
  dueDate?: string;
  iptuNotAvailable?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  year: number;
  occupiedArea: number;
  selectedSequential?: string;
  isSingleTenant?: boolean;
  manualPercentage?: number;
  contractStart?: string;
  contractEnd?: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  ownerName: string;
  registryOwner: string;
  possession: 'Grupo' | 'Terceiros' | 'Específico';
  registrationNumber: string;
  sequential: string;
  isComplex: boolean;
  units: PropertyUnit[];
  tenants: Tenant[];
  landArea: number;
  builtArea: number;
  type: PropertyType;
  appraisalValue: number;
  baseYear: number;
  lastUpdated: string;
  imageUrl: string;
  iptuHistory: IptuRecord[];
}

export type UserRole = 'Usuário' | 'Gestor' | 'Administrador' | 'Visitante';

// Fix: Added missing AppUser interface required by GerenciamentoView.tsx
export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: string;
  lastAccess: string;
  mustChangePassword?: boolean;
}

export interface AuditLog {
  id: string;
  created_at: string;
  user_id?: string;
  user_email: string;
  user_name: string;
  action: string;
  details: string;
}

export interface AppNotification {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  date: string;
  propertyId: string;
  read: boolean;
  daysDiff?: number;
}

export type ViewType = 'dashboard' | 'properties' | 'calendar' | 'financial' | 'reports' | 'login' | 'team' | 'audit';
