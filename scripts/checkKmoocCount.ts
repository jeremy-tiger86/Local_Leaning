import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function check() {
    const { count } = await supabase.from('lectures').select('*', { count: 'exact', head: true }).like('id', 'KMOOC_%');
    console.log(`Real K-MOOC count in DB: ${count}`);
}
check();
