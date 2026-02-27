import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function removeMockData() {
    console.log('Removing mock K-MOOC data from Supabase...');
    const { data: selectData, error: selectError } = await supabase
        .from('lectures')
        .select('id, title')
        .ilike('title', '%K-MOOC 모의데이터%');

    if (selectError) {
        console.error('Error fetching mock data:', selectError);
        return;
    }

    if (!selectData || selectData.length === 0) {
        console.log('No mock data found.');
        return;
    }

    console.log(`Found ${selectData.length} mock items to delete.`);

    const { error: deleteError } = await supabase
        .from('lectures')
        .delete()
        .ilike('title', '%K-MOOC 모의데이터%');

    if (deleteError) {
        console.error('Error deleting mock data:', deleteError);
    } else {
        console.log('Successfully deleted mock data.');
    }
}

removeMockData();
