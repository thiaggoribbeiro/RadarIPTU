import fs from 'fs';
import crypto from 'crypto';

const csvData = fs.readFileSync('afogados_data.csv', 'utf8').trim();
const lines = csvData.split('\n');
const headers = lines[0].split(';');

const units = [];
const tenants = [];

const cleanNum = (str) => {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
};

for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    if (cols.length < 2) continue;
    const row = {};
    headers.forEach((h, idx) => {
        row[h.trim()] = cols[idx] ? cols[idx].trim() : '';
    });

    const sequential = row['sequencial'];
    const registrationNumber = row['incrição'];
    const address = row['Endereco do Sequencial'];
    const ownerName = row['Proprietário atual'];
    const registryOwner = row['Proprietário Cadastro Imobiliário'];
    const tenantName = row['Locatário'];

    [2023, 2024, 2025].forEach(year => {
        const yearStr = year.toString();
        const singleKey = year === 2025 ? 'COTA ÚNICA 2025' : `Cota única ${yearStr}`;
        const installKey = year === 2025 ? 'PARCELADO 2025' : `Valor Parcelado ${yearStr}`;
        const countKey = `Parcelas ${yearStr}`;
        const methodKey = `Forma Pagamento ${yearStr}`;

        const singleValue = cleanNum(row[singleKey]);
        const installmentValue = cleanNum(row[installKey]);
        const installmentsCount = parseInt(row[countKey]) || 1;
        const chosenMethod = (row[methodKey] || '').toUpperCase() === 'COTA ÚNICA' ? 'Cota Única' : 'Parcelado';

        units.push({
            registrationNumber,
            sequential,
            address,
            ownerName,
            registryOwner,
            singleValue,
            installmentValue,
            installmentsCount,
            year,
            chosenMethod,
            status: 'Em aberto'
        });

        if (tenantName) {
            tenants.push({
                id: crypto.randomUUID(),
                name: tenantName,
                year,
                occupiedArea: 0,
                selectedSequential: sequential,
                isSingleTenant: false
            });
        }
    });
}

function pgEscape(str) {
    return str.replace(/'/g, "''");
}

const sql = `UPDATE public.properties SET 
    address = 'RUA JOAO IVO DA SILVA, 104',
    neighborhood = 'Prado',
    city = 'Recife',
    state = 'PE',
    zip_code = '50720155',
    units = '${pgEscape(JSON.stringify(units))}'::jsonb,
    tenants = '${pgEscape(JSON.stringify(tenants))}'::jsonb,
    last_updated = '${new Date().toLocaleDateString('pt-BR')}'
WHERE id = 'a7c23e18-30d3-460e-a3e2-f9892f347043';`;

fs.writeFileSync('update_afogados.sql', sql);
console.log('SQL generated.');
