const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://aqwuxqfsxnzfyhvjvugu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxd3V4cWZzeG56Znlodmp2dWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTA5MTgsImV4cCI6MjA4MTc4NjkxOH0.YyR9T2DS5vgbIVid1mb7dAqXgh_a8TRnJPqGrfzlOb0';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function createUser() {
    console.log('Iniciando criação de Visitante (visitante@parvi.com.br)...');
    const { data, error } = await supabase.auth.signUp({
        email: 'visitante@parvi.com.br',
        password: 'Parvi2026',
        options: {
            data: {
                full_name: 'Visitante',
                role: 'Visitante'
            }
        }
    });

    if (error) {
        console.error('Erro ao criar usuário:', error.message);
        process.exit(1);
    } else {
        console.log('Usuário criado com sucesso!');
        console.log('ID do Usuário:', data.user ? data.user.id : 'Pendente de confirmação');
        process.exit(0);
    }
}

createUser();
