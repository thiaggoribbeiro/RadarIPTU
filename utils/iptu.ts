import { IptuRecord, IptuStatus, Property } from '../types';

export const getDynamicStatus = (iptu: IptuRecord) => {
    return iptu.status || IptuStatus.PENDING;
};

export const getPropertyStatus = (property: Property, year: number): IptuStatus => {
    const yearUnits = property.units.filter(u => u.year === year);
    if (yearUnits.length === 0) return IptuStatus.PENDING;

    const allPaid = yearUnits.every(u => u.status === IptuStatus.PAID);
    if (allPaid) return IptuStatus.PAID;

    const anyInProgress = yearUnits.some(u => u.status === IptuStatus.IN_PROGRESS);
    if (anyInProgress) return IptuStatus.IN_PROGRESS;

    const anyOpen = yearUnits.some(u => u.status === IptuStatus.OPEN);
    if (anyOpen) return IptuStatus.OPEN;

    return IptuStatus.PENDING;
};

export const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    // dateString comes in YYYY-MM-DD from the input[type=date]
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
};
