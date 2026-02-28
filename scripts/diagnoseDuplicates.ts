import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function diagnoseDuplicates() {
    console.log('=== 중복 데이터 진단 ===\n');

    // 1. 전체 강좌 수
    const { count: total } = await supabase
        .from('lectures')
        .select('*', { count: 'exact', head: true });
    console.log(`전체 강좌 수: ${total}개`);

    // 2. 서울 중구 강좌 총 수
    const { data: seoulData, count: seoulCount } = await supabase
        .from('lectures')
        .select('id, title, address', { count: 'exact' })
        .or('address.ilike.%서울%, address.ilike.%서울특별시%')
        .ilike('address', '%중구%')
        .not('address', 'ilike', '%온라인%')
        .limit(100);

    console.log(`\n서울 중구 강좌 수: ${seoulCount}개 (최대 100개 조회)`);

    // 3. 제목 기준 중복 탐지
    const titleCount: Record<string, number> = {};
    seoulData?.forEach((d: any) => {
        titleCount[d.title] = (titleCount[d.title] || 0) + 1;
    });

    const duplicates = Object.entries(titleCount).filter(([, cnt]) => cnt > 1);
    console.log(`\n중복 제목 수: ${duplicates.length}개`);
    if (duplicates.length > 0) {
        console.log('중복 항목:');
        duplicates.forEach(([title, cnt]) => console.log(`  [${cnt}개] ${title}`));
    } else {
        console.log('→ 제목 기준 중복 없음');
    }

    // 4. ID 기준 중복 탐지  
    const idCount: Record<string, number> = {};
    seoulData?.forEach((d: any) => {
        idCount[d.id] = (idCount[d.id] || 0) + 1;
    });

    const idDuplicates = Object.entries(idCount).filter(([, cnt]) => cnt > 1);
    console.log(`\nID 기준 중복: ${idDuplicates.length}개`);
    if (idDuplicates.length > 0) {
        console.log('중복 ID:', idDuplicates);
    }

    // 5. 처음 10개 샘플
    console.log('\n샘플 10개:');
    seoulData?.slice(0, 10).forEach((d: any) => {
        console.log(`  [${d.id}] ${d.title} / ${d.address?.substring(0, 40)}`);
    });

    process.exit(0);
}

diagnoseDuplicates();
