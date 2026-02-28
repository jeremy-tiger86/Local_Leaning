import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkDateColumns() {
    // 첫 번째 강좌의 모든 컬럼 확인
    const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .limit(3);

    if (error) { console.error(error); process.exit(1); }

    console.log('=== lectures 테이블 컬럼 및 샘플 데이터 ===\n');
    if (data && data.length > 0) {
        console.log('컬럼 목록:', Object.keys(data[0]));
        console.log('\n샘플 데이터 1:');
        console.log(JSON.stringify(data[0], null, 2));
    }

    // 날짜 관련 컬럼에서 실제 데이터 확인
    const { data: sample } = await supabase
        .from('lectures')
        .select('id, title, period, apply_end, lecture_end, apply_start, end_date, start_date')
        .limit(5);

    console.log('\n날짜 컬럼 시도 (에러시 컬럼 없음):');
    console.log(JSON.stringify(sample?.[0] || 'no data', null, 2));

    process.exit(0);
}

checkDateColumns();
