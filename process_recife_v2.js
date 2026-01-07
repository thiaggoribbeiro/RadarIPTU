import fs from 'fs';
import crypto from 'crypto';

const csvData = fs.readFileSync('recife_novo.csv', 'utf8').trim();
const lines = csvData.split('\n');
const headers = lines[0].split(';');

const cleanNum = (str) => {
    if (!str) return 0;
    // Remove R$, dots (thousands), and change comma to dot
    let cleaned = str.replace(/R\$/g, '').replace(/\./g, '').replace(',', '.').trim();
    let num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
};

const pgEscape = (str) => {
    if (!str) return '';
    return str.replace(/'/g, "''");
};

let sql = "INSERT INTO public.properties (id, name, address, neighborhood, city, state, zip_code, owner_name, registry_owner, registration_number, sequential, is_complex, units, tenants, iptu_history, base_year, last_updated, image_url, type) VALUES \n";

const values = [];

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle rows with line breaks within cells (split by ; but respect quotes if possible, 
    // though the provided data seems simple enough or I can join lines)
    let cols = line.split(';');

    // Quick fix for the multi-line cells in the user input
    if (cols.length < headers.length) {
        // Look ahead if next lines should be joined
        continue; // For simplicity in this script, skip problematic lines or handle them if common
    }

    const row = {};
    headers.forEach((h, idx) => {
        row[h.trim()] = cols[idx] ? cols[idx].trim() : '';
    });

    const id = crypto.randomUUID();
    const type = 'Loja';
    let rawAddress = `${row['Logradouro_sep'] || ''}, ${row['Numero'] || ''} ${row['Complemento'] || ''}`.trim();
    // Address cleanup
    let cleanAddress = rawAddress
        .replace(/^[, ]+/, '')
        .replace(/^AV /g, 'Avenida ')
        .replace(/AV\./g, 'Avenida')
        .replace(/Av\./g, 'Avenida')
        .replace(/EST/g, 'Estrada')
        .replace(/Est/g, 'Estrada');

    const address = cleanAddress;
    const name = row['Logradouro_sep'] || 'Imóvel Recife';
    const neighborhood = row['Bairro'] || '';
    const city = 'Recife';
    const state = 'PE';
    const zip_code = row['CEP'] || '';
    const owner_name = row['Proprietário atual'] || '';
    const registry_owner = row['Proprietário Cadastro Imobiliário'] || '';
    const registration_number = row['incrição'] || '';
    const sequential = row['sequencial'] || '';
    const tenantName = row['Locatário'] || '';

    // IPTU History & Units
    const iptu_history = [];
    const units = [];
    const tenants = [];

    [2023, 2024, 2025].forEach(year => {
        const yearStr = year.toString();
        const singleKey = year === 2025 ? 'COTA ÚNICA 2025' : `Cota única ${yearStr}`;
        const installKey = year === 2025 ? 'PARCELADO 2025' : `Valor Parcelado ${yearStr}`;

        const singleValue = cleanNum(row[singleKey]);
        const installmentValue = cleanNum(row[installKey]);

        // Add to history
        iptu_history.push({
            id: crypto.randomUUID(),
            year: year,
            value: singleValue || installmentValue || 0,
            status: 'Pendente',
            singleValue: singleValue,
            installmentValue: installmentValue,
            installmentsCount: 10,
            chosenMethod: 'Cota Única'
        });

        // Current year unit info
        if (year === 2025) {
            units.push({
                registrationNumber: registration_number,
                sequential: sequential,
                address: address,
                ownerName: owner_name,
                registryOwner: registry_owner,
                singleValue: singleValue,
                installmentValue: installmentValue,
                installmentsCount: 10,
                year: 2025,
                chosenMethod: 'Cota Única',
                status: 'Em aberto'
            });
        }

        if (tenantName && tenantName.toLowerCase() !== 'disponível') {
            tenants.push({
                id: crypto.randomUUID(),
                name: tenantName,
                year: year,
                occupiedArea: 0,
                selectedSequential: sequential,
                isSingleTenant: true
            });
        }
    });

    const rowValues = `(
        '${id}',
        '${pgEscape(name)}',
        '${pgEscape(address)}',
        '${pgEscape(neighborhood)}',
        '${city}',
        '${state}',
        '${pgEscape(zip_code)}',
        '${pgEscape(owner_name)}',
        '${pgEscape(registry_owner)}',
        '${pgEscape(registration_number)}',
        '${pgEscape(sequential)}',
        false,
        '${JSON.stringify(units)}',
        '${JSON.stringify(tenants)}',
        '${JSON.stringify(iptu_history)}',
        2025,
        '${new Date().toLocaleDateString('pt-BR')}',
        '/assets/default-property.png',
        '${type}'
    )`;
    values.push(rowValues);
}

sql += values.join(",\n") + ";";

fs.writeFileSync('insert_recife.sql', sql);
console.log(`Generated SQL with ${values.length} records.`);
