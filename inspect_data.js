
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://aqwuxqfsxnzfyhvjvugu.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectStatuses() {
    const { data: properties, error } = await supabase
        .from('properties')
        .select('name, units, iptu_history')
        .limit(5);

    if (error) {
        console.error('Error fetching properties:', error);
        return;
    }

    properties.forEach(p => {
        console.log(`Property: ${p.name}`);
        console.log('Units:', p.units?.map(u => ({ year: u.year, status: u.status })));
        console.log('History:', p.iptu_history?.map(h => ({ year: h.year, status: h.status })));
        console.log('---');
    });
}

inspectStatuses();
