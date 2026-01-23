
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pivljndfuxjnmocayymz.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.error('ERRO: VITE_SUPABASE_ANON_KEY não encontrada no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function bulkUpdate2025Status() {
    console.log('Iniciando atualização em massa dos status de 2025 para "Pago"...');

    const { data: properties, error } = await supabase
        .from('properties')
        .select('id, units, name');

    if (error) {
        console.error('Erro ao buscar imóveis:', error);
        return;
    }

    console.log(`Encontrados ${properties.length} imóveis.`);

    let updatedCount = 0;

    for (const property of properties) {
        let units = property.units || [];
        let hasChanges = false;

        const newUnits = units.map(unit => {
            if (unit.year === 2025 && unit.status !== 'Pago') {
                hasChanges = true;
                return { ...unit, status: 'Pago' };
            }
            return unit;
        });

        if (hasChanges) {
            const { error: updateError } = await supabase
                .from('properties')
                .update({ units: newUnits })
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

bulkUpdate2025Status();
