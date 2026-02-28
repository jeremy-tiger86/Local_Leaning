import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function removeDuplicates() {
    console.log('=== DB 중복 제거 시작 ===\n');

    // 전체 강좌 가져오기 (오프라인만, 청크 단위)
    let allDeleted = 0;
    let offset = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('lectures')
            .select('id, title, address, created_at')
            .not('address', 'ilike', '%온라인%')
            .not('link', 'ilike', '%kmooc.kr%')
            .range(offset, offset + pageSize - 1)
            .order('created_at', { ascending: true }); // 오래된 것 먼저 (최신 유지)

        if (error) { console.error('조회 에러:', error); break; }
        if (!data || data.length === 0) break;

        // title + address 기준 중복 탐지
        const seen = new Map<string, string>(); // key -> id (유지할 첫 번째)
        const toDelete: string[] = [];

        data.forEach((row: any) => {
            const key = `${row.title}||${row.address}`;
            if (seen.has(key)) {
                toDelete.push(row.id); // 중복은 삭제
            } else {
                seen.set(key, row.id); // 첫 번째는 유지
            }
        });

        if (toDelete.length > 0) {
            // 100개씩 배치 삭제
            for (let i = 0; i < toDelete.length; i += 100) {
                const batch = toDelete.slice(i, i + 100);
                const { error: delErr } = await supabase
                    .from('lectures')
                    .delete()
                    .in('id', batch);
                if (delErr) console.error('삭제 에러:', delErr);
                else allDeleted += batch.length;
            }
            console.log(`offset ${offset}: ${toDelete.length}개 삭제`);
        }

        if (data.length < pageSize) break;
        offset += pageSize;
    }

    console.log(`\n=== 완료: 총 ${allDeleted}개 중복 레코드 삭제 ===`);

    // 최종 확인
    const { count } = await supabase
        .from('lectures')
        .select('*', { count: 'exact', head: true });
    console.log(`정리 후 전체 강좌 수: ${count}개`);

    process.exit(0);
}

removeDuplicates();
