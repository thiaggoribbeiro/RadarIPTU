import { IptuRecord, IptuStatus, Property } from '../types';

/**
 * Parses a date string in "YYYY-MM-DD" format as a local Date object.
 * This avoids the 1-day offset issue caused by new Date("YYYY-MM-DD") parsing as UTC.
 */
export const parseLocalDate = (dateString?: string): Date | null => {
    if (!dateString) return null;
    const parts = dateString.split('-');
    if (parts.length !== 3) return new Date(dateString);
    const [year, month, day] = parts.map(p => parseInt(p, 10));
    // month is 0-indexed in Date constructor
    return new Date(year, month - 1, day);
};

export const getDynamicStatus = (iptu: IptuRecord) => {
    return iptu.status || IptuStatus.PENDING;
};

export const getPropertyStatus = (property: Property, year: number): IptuStatus => {
    const yearUnits = property.units.filter(u => u.year === year);
    if (yearUnits.length === 0) return IptuStatus.PENDING;

    if (yearUnits.every(u => u.status === IptuStatus.PAID)) return IptuStatus.PAID;
    if (yearUnits.some(u => u.status === IptuStatus.IN_PROGRESS)) return IptuStatus.IN_PROGRESS;
    if (yearUnits.some(u => u.status === IptuStatus.IN_ANALYSIS)) return IptuStatus.IN_ANALYSIS;
    if (yearUnits.some(u => u.status === IptuStatus.UNDEFINED)) return IptuStatus.UNDEFINED;
    if (yearUnits.some(u => u.status === IptuStatus.LAUNCHED)) return IptuStatus.LAUNCHED;
    if (yearUnits.some(u => u.status === IptuStatus.OPEN)) return IptuStatus.OPEN;

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

export const hasPreviousDebts = (property: Property, currentYear: number): boolean => {
    // Pegamos todos os anos que já possuem dados granulares (units) para anos anteriores ao atual
    // Usamos Number() para garantir comparação numérica
    const yearsWithUnits = new Set(
        property.units
            .filter(u => Number(u.year) < Number(currentYear))
            .map(u => Number(u.year))
    );

    // 1. Verificar em units (dados granulares)
    const hasUnpaidUnit = property.units.some(u => {
        const year = Number(u.year);
        if (year >= Number(currentYear)) return false;

        // Comparação de status case-insensitive
        const isPaid = String(u.status || '').toLowerCase() === 'pago';
        const hasValue = (Number(u.singleValue) || 0) > 0 || (Number(u.installmentValue) || 0) > 0;

        return !isPaid && hasValue;
    });

    if (hasUnpaidUnit) return true;

    // 2. Verificar em iptuHistory (apenas anos que NÃO possuem units)
    // Se um ano já tem units, o status real é o das units (item 1 acima)
    const hasUnpaidHistory = property.iptuHistory.some(h => {
        const year = Number(h.year);
        if (year >= Number(currentYear)) return false;
        if (yearsWithUnits.has(year)) return false;

        const status = String(h.status || IptuStatus.PENDING).toLowerCase();
        return status !== 'pago';
    });

    return hasUnpaidHistory;
};
