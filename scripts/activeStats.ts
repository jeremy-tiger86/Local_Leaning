import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

function parseEndDate(period: string): Date | null {
    if (!period) return null;
    const parts = period.split('~');
    if (parts.length < 2) return null;
    const endStr = parts[1].trim();
    const date = new Date(endStr);
    return isNaN(date.getTime()) ? null : date;
}

async function fetchAll() {
    let allData: any[] = [];
    let from = 0;
    let to = 999;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await sb
            .from('lectures')
            .select('id, period')
            .range(from, to);

        if (error) {
            console.error('Error fetching data:', error);
            break;
        }
        if (!data || data.length === 0) break;

        allData = allData.concat(data);
        if (data.length < pageSize) break;

        from += pageSize;
        to += pageSize;
    }
    return allData;
}

async function runStatistic() {
    const today = new Date('2026-02-27');
    today.setHours(0, 0, 0, 0);

    console.log('DB에서 전체 데이터를 가져오는 중입니다... (약 4.5만 건)');
    const data = await fetchAll();

    const offlineTotal = data.filter(it => it.id.startsWith('STD_'));
    const onlineTotal = data.filter(it => it.id.startsWith('KMOOC_'));

    const offlineActive = offlineTotal.filter(it => {
        const endDate = parseEndDate(it.period);
        return endDate && endDate >= today;
    });

    const onlineActive = onlineTotal.filter(it => {
        const endDate = parseEndDate(it.period);
        return endDate && endDate >= today;
    });

    console.log('\n--- DB 강의 통계 보고 (2026-02-27 기준) ---');
    console.log('1. 오프라인 강좌 (STD 소스)');
    console.log('   - 전체 적재 건수:', offlineTotal.length.toLocaleString(), '건');
    console.log('   - 오늘 기준 운영 중:', offlineActive.length.toLocaleString(), '건');

    console.log('\n2. 온라인 강좌 (KMOOC 소스)');
    console.log('   - 전체 적재 건수:', onlineTotal.length.toLocaleString(), '건');
    console.log('   - 오늘 기준 운영 중:', onlineActive.length.toLocaleString(), '건');

    console.log('\n3. 총계');
    console.log('   - 전체 강좌:', (offlineTotal.length + onlineTotal.length).toLocaleString(), '건');
    console.log('   - 전체 운영 중:', (offlineActive.length + onlineActive.length).toLocaleString(), '건');

    process.exit(0);
}

runStatistic();
