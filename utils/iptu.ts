
import { IptuRecord, IptuStatus } from '../types';

export const getDynamicStatus = (iptu: IptuRecord) => {
    return iptu.status || IptuStatus.PENDING;
};

export const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    // dateString comes in YYYY-MM-DD from the input[type=date]
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
};
