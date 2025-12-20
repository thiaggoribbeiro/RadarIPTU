
export enum IptuStatus {
  PAID = 'Pago',
  PENDING = 'Pendente',
  OVERDUE = 'Atrasado',
  ARCHIVED = 'Arquivado',
  IN_PAYMENT = 'Em pagamento'
}

export type PaymentMethod = 'Cota Única' | 'Parcelado' | 'Em aberto';

export interface IptuRecord {
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
}

export type PropertyType = 'Loja' | 'Galpão' | 'Terreno' | 'Sala' | 'Apartamento' | 'Casa' | 'Industrial' | 'Comercial' | 'Residencial' | 'Prédio Comercial' | 'Sala Comercial';

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
  possession: 'Grupo' | 'Terceiros';
  registrationNumber: string;
  sequential: string;
  landArea: number;
  builtArea: number;
  type: PropertyType;
  appraisalValue: number;
  lastUpdated: string;
  imageUrl: string;
  iptuHistory: IptuRecord[];
}

export type UserRole = 'Usuário' | 'Gestor' | 'Administrador';

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

export type ViewType = 'dashboard' | 'properties' | 'financial' | 'reports' | 'login';
