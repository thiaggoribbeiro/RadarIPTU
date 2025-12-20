
import { IptuRecord, IptuStatus } from '../types';

export const getDynamicStatus = (iptu: IptuRecord) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (!iptu.startDate || iptu.chosenMethod === 'Em aberto') return IptuStatus.PENDING;

    const [year, month, day] = iptu.startDate.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    start.setHours(0, 0, 0, 0);

    if (iptu.chosenMethod === 'Cota Única') {
        return start <= now ? IptuStatus.PAID : IptuStatus.PENDING;
    }

    if (iptu.chosenMethod === 'Parcelado') {
        const installments = iptu.installmentsCount || 1;
        const monthsSinceStart = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        if (monthsSinceStart < installments) {
            if (start > now) return IptuStatus.PENDING;
            return IptuStatus.IN_PAYMENT;
        } else {
            return IptuStatus.PAID;
        }
    }

    return iptu.status;
};

export const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    // dateString comes in YYYY-MM-DD from the input[type=date]
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
};
