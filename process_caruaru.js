const data = `Logradouro_sep;Numero;Complemento;Bairro;CEP;Cidade;UF;Proprietário atual;incrição;sequencial;Proprietário Cadastro Imobiliário;Locatário;Cota única 2023;Valor Parcelado 2023;Cota única 2024;Valor Parcelado 2024;COTA ÚNICA 2025;PARCELADO 2025
AVENIDA JOSE PINHEIRO DOS SANTOS;70;;PINHEIRÓPOLIS;55100-000;CARUARU;PE;CASA AMARELA;22004604031200000000;67387;Pedro Everton Schwambach;Toyolex Caruaru;;;25.053,51;35.036,76;R$ 26.245,58;R$ 36.780,00
AVENIDA JOSE PINHEIRO DOS SANTOS;93;;PINHEIRÓPOLIS;55100-000;CARUARU;PE;PLUS IMOVEIS - SA;22004604032500000000;67402;SOLO IMOBILIARIA LTDA;BREMEN CARUARU;;;29.885,42;41.939,49;R$ 31.307,41;R$ 43.942,66
RUA DOUTOR JOSE RAFAEL CAVALCANTI;271;;PETROPÓLIS;55032-570;CARUARU;PE;PLUS IMOVEIS - SA;22003301004800000000;96339;MANUTE CONFECCOES LTDA;Toyolex Funilaria;;;2.039,41;2.647,21;R$ 2.039,41;R$ 2.849,36
AV JOSE CARLOS DE OLIVEIRA;132;;UNIVERSITÁRIO;55016-683;CARUARU;PE;PLUS IMOVEIS - SA;37003403025700000000;88168;CIDADE ALTA PROJETO IMOB LTDA;GGE;;;13.568,28;18.629,29;R$ 14.213,84;R$ 19.591,86
RUA PROFESSOR AZAEL LEITÃO;140;;UNIVERSITÁRIO;55016-684;CARUARU;PE;PPBB;37003404048000000000;88184;CIDADE ALTA PROJETO IMOB LTDA;GGE;;;53.758,26;78.727,22;R$ 56.316,03;R$ 79.737,84
Rua Projetada R-7;6;LOTE 14 A;;;CARUARU;PE;SOLO IMOBILIARIA LTDA;22004602015300000000;67392;SOLO IMOBILIARIA LTDA;-;;;-;-;;
Rua Projetada R-7;7;LOTE 14 A;;;CARUARU;PE;SOLO IMOBILIARIA LTDA;22004602014100000000;67393;SOLO IMOBILIARIA LTDA;-;;;-;-;;
RUA PROJETADA R-7;8;LOTE 14 A;;;CARUARU;PE;SOLO IMOBILIARIA LTDA;22004602012900000000;67394;SOLO IMOBILIARIA LTDA;-;;;-;-;;
AVENIDA JOSE PINHEIRO DOS SANTOS;15;LOTE 14 A;;;CARUARU;PE;SOLO IMOBILIARIA LTDA;22004604033800000000;67401;SOLO IMOBILIARIA LTDA;;;;-;-;;
AVENIDA EURICO JOSE AMORIM RIBEIRO DE SOUZA;185;;PETROPÓLIS;;CARUARU;PE;CASA AMARELA;22004500028900000000;86622;CASA AMARELA;Forrozão;;;11.752,79;16.035,74;R$ 12.312,17;R$ 16.875,19
AV JOSE PINHEIRO DOS SANTOS;800;;AGAMENON MAGALHÃES;55100-000;CARUARU;PE;CASA AMARELA;20101302023500000000;6665;CASA AMARELA;BYD;;;25.158,44;35.193,94;R$ 26.355,56;R$ 36.937,17`;

const lines = data.trim().split('\n');
const headers = lines[0].split(';');

function cleanValue(val) {
    if (!val || val === '-' || val === '') return 0;
    return parseFloat(val.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
}

function generateId() {
    return Math.random().toString(36).substring(2, 10) + '-' + Math.random().toString(36).substring(2, 6);
}

const sql = lines.slice(1).map(line => {
    const values = line.split(';');
    const row = {};
    headers.forEach((h, i) => row[h] = values[i]);

    const address = row.Logradouro_sep + ', ' + row.Numero + (row.Complemento ? ' ' + row.Complemento : '');
    const name = row.Logradouro_sep + ', ' + row.Numero;

    const iptu2023_single = cleanValue(row['Cota única 2023']);
    const iptu2023_parcelado = cleanValue(row['Valor Parcelado 2023']);
    const iptu2024_single = cleanValue(row['Cota única 2024']);
    const iptu2024_parcelado = cleanValue(row['Valor Parcelado 2024']);
    const iptu2025_single = cleanValue(row['COTA ÚNICA 2025']);
    const iptu2025_parcelado = cleanValue(row['PARCELADO 2025']);

    const iptu_history = [];
    if (iptu2023_single > 0 || iptu2023_parcelado > 0) {
        iptu_history.push({ id: generateId(), year: 2023, value: iptu2023_single || iptu2023_parcelado, status: 'Pago', singleValue: iptu2023_single, chosenMethod: 'Cota Única', installmentValue: iptu2023_parcelado, installmentsCount: 10 });
    }
    if (iptu2024_single > 0 || iptu2024_parcelado > 0) {
        iptu_history.push({ id: generateId(), year: 2024, value: iptu2024_single || iptu2024_parcelado, status: 'Pago', singleValue: iptu2024_single, chosenMethod: 'Cota Única', installmentValue: iptu2024_parcelado, installmentsCount: 10 });
    }
    if (iptu2025_single > 0 || iptu2025_parcelado > 0) {
        iptu_history.push({ id: generateId(), year: 2025, value: iptu2025_single || iptu2025_parcelado, status: 'Pago', singleValue: iptu2025_single, chosenMethod: 'Cota Única', installmentValue: iptu2025_parcelado, installmentsCount: 10 });
    }

    const unit = { year: 2025, status: 'Pago', address: address, ownerName: row['Proprietário atual'], sequential: row.sequencial, singleValue: iptu2025_single, chosenMethod: 'Cota Única', registryOwner: row['Proprietário Cadastro Imobiliário'], installmentValue: iptu2025_parcelado, installmentsCount: 10, registrationNumber: row['incrição'] };

    const tenants = [];
    if (row.Locatário && row.Locatário !== '-') {
        [2023, 2024, 2025].forEach(year => {
            tenants.push({ id: generateId(), name: row.Locatário, year: year, occupiedArea: 0, isSingleTenant: true, selectedSequential: row.sequencial });
        });
    }

    return "INSERT INTO properties (name, address, neighborhood, city, state, zip_code, owner_name, registry_owner, registration_number, sequential, iptu_history, units, tenants, base_year, last_updated, image_url) VALUES (" +
        "'" + name.replace(/'/g, "''") + "', " +
        "'" + address.replace(/'/g, "''") + "', " +
        "'" + row.Bairro.replace(/'/g, "''") + "', " +
        "'" + row.Cidade.replace(/'/g, "''") + "', " +
        "'" + row.UF.replace(/'/g, "''") + "', " +
        "'" + row.CEP.replace(/'/g, "''") + "', " +
        "'" + row['Proprietário atual'].replace(/'/g, "''") + "', " +
        "'" + row['Proprietário Cadastro Imobiliário'].replace(/'/g, "''") + "', " +
        "'" + row['incrição'].replace(/'/g, "''") + "', " +
        "'" + row.sequencial.replace(/'/g, "''") + "', " +
        "'" + JSON.stringify(iptu_history).replace(/'/g, "''") + "', " +
        "'" + JSON.stringify([unit]).replace(/'/g, "''") + "', " +
        "'" + JSON.stringify(tenants).replace(/'/g, "''") + "', " +
        "2025, '15/01/2026', '/assets/default-property.png');";
}).join('\n');

const fs = require('fs');
fs.writeFileSync('caruaru_inserts.sql', sql, 'utf8');
console.log('SQL generated successfully in caruaru_inserts.sql');
