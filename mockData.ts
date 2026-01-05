
import { Property, IptuStatus } from './types';

export const mockProperties: Property[] = [
  {
    id: '1',
    name: 'Edifício Horizon',
    address: 'Av. Paulista, 1000 - Apt 42',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    ownerName: 'Ricardo Almeida',
    registryOwner: 'Imobiliária Horizon LTDA',
    possession: 'Terceiros',
    registrationNumber: '123.456.789-01',
    sequential: '0042-B',
    isComplex: false,
    units: [{
      sequential: '0042-B',
      singleValue: 1250,
      installmentValue: 1350,
      installmentsCount: 10,
      year: 2024,
      chosenMethod: 'Cota Única'
    }],
    tenants: [],
    landArea: 1200,
    builtArea: 85,
    type: 'Apartamento',
    appraisalValue: 850000,
    baseYear: 2024,
    lastUpdated: '15/01/2024',
    imageUrl: 'https://picsum.photos/seed/horizon/400/400',
    iptuHistory: [
      { id: 'h1', year: 2024, value: 1250.00, status: IptuStatus.PENDING, dueDate: '15/04/2024' },
      { id: 'h2', year: 2023, value: 1180.00, status: IptuStatus.PAID, dueDate: '15/04/2023' },
    ]
  },
  {
    id: '3',
    name: 'Galpão Industrial Jundiaí',
    address: 'Rodovia SP-300, Km 12',
    neighborhood: 'Industrial',
    city: 'Jundiaí',
    state: 'SP',
    zipCode: '13200-000',
    ownerName: 'Logistics SA',
    registryOwner: 'Grupo Logístico Brasil',
    possession: 'Grupo',
    registrationNumber: '555.444.333-88',
    sequential: 'G-1200',
    isComplex: false,
    units: [{
      sequential: 'G-1200',
      singleValue: 4500,
      installmentValue: 4800,
      installmentsCount: 12,
      year: 2024,
      chosenMethod: 'Parcelado'
    }],
    tenants: [],
    landArea: 5000,
    builtArea: 2500,
    type: 'Galpão',
    appraisalValue: 4500000,
    baseYear: 2024,
    lastUpdated: '05/01/2024',
    imageUrl: 'https://picsum.photos/seed/factory/400/400',
    iptuHistory: [
      { id: 'h3', year: 2024, value: 4500.00, status: IptuStatus.OVERDUE, dueDate: '22/04/2024' },
      { id: 'h4', year: 2023, value: 4200.00, status: IptuStatus.PAID, dueDate: '22/04/2023' },
    ]
  }
];
