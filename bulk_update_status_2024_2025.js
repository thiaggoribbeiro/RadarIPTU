
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://aqwuxqfsxnzfyhvjvugu.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.error('ERRO: VITE_SUPABASE_ANON_KEY não encontrada no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function bulkUpdateStatus() {
    console.log('Iniciando atualização em massa dos status de 2024 e 2025 para "Pago"...');

    const { data: properties, error } = await supabase
        .from('properties')
        .select('id, units, iptu_history, name');

    if (error) {
        console.error('Erro ao buscar imóveis:', error);
        return;
    }

    console.log(`Encontrados ${properties.length} imóveis.`);

    let updatedCount = 0;

    for (const property of properties) {
        let hasChanges = false;

        // Update units
        const units = property.units || [];
        const newUnits = units.map(unit => {
            const year = Number(unit.year);
            const status = String(unit.status || '').toLowerCase();

            if ((year === 2024 || year === 2025) && status !== 'pago') {
                hasChanges = true;
                return { ...unit, status: 'Pago' };
            }
            return unit;
        });

        // Update iptu_history
        const history = property.iptu_history || [];
        const newHistory = history.map(h => {
            const year = Number(h.year);
            const status = String(h.status || '').toLowerCase();

            if ((year === 2024 || year === 2025) && status !== 'pago') {
                hasChanges = true;
                return { ...h, status: 'Pago' };
            }
            return h;
        });

        if (hasChanges) {
            const { error: updateError } = await supabase
                .from('properties')
                .update({
                    units: newUnits,
                    iptu_history: newHistory,
                    last_updated: new Date().toLocaleDateString('pt-BR')
                })
                .eq('id', property.id);

            if (updateError) {
                console.error(`Erro ao atualizar imóvel ${property.name}:`, updateError);
            } else {
                console.log(`✓ Imóvel atualizado: ${property.name}`);
                updatedCount++;
            }
        }
    }

    console.log(`\nFim da operação. ${updatedCount} imóveis foram atualizados.`);
}

bulkUpdateStatus();
