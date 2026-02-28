/**
 * migrateApplyEnd.ts
 * 
 * 기존 DB의 모든 강좌에 대해 `period` 컬럼을 파싱하여
 * `apply_end` DATE 컬럼을 채우는 1회성 마이그레이션 스크립트.
 * 
 * 실행 전 Supabase에서 아래 SQL을 먼저 실행해야 함:
 * ALTER TABLE lectures ADD COLUMN IF NOT EXISTS apply_end DATE;
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 500;

/**
 * period 문자열에서 종료일을 파싱하여 YYYY-MM-DD 반환
 * 예: "2026-01-01 ~ 2026-03-31" → "2026-03-31"
 * 예: "2026.01.01 ~ 2026.03.31" → "2026-03-31"
 * 온라인 강좌("상시") → null
 */
function parseApplyEnd(period: string | null | undefined): string | null {
    if (!period || period === '상시') return null;
    const parts = period.split('~');
    if (parts.length < 2) return null;
    const endStr = parts[1].trim().replace(/\./g, '-');
    const d = new Date(endStr);
    if (isNaN(d.getTime())) return null;
    // YYYY-MM-DD 형식으로 반환
    return endStr.match(/^\d{4}-\d{2}-\d{2}$/) ? endStr : null;
}

async function migrate() {
    console.log('=== apply_end 마이그레이션 시작 ===');
    console.log('대상: 전체 강좌의 period → apply_end 파싱·저장\n');

    let offset = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('lectures')
            .select('id, period')
            .range(offset, offset + BATCH_SIZE - 1);

        if (error) {
            console.error('조회 오류:', error);
            break;
        }

        if (!data || data.length === 0) {
            hasMore = false;
            break;
        }

        // apply_end 파싱
        const updates: { id: string; apply_end: string | null }[] = data.map(row => ({
            id: row.id,
            apply_end: parseApplyEnd(row.period),
        }));

        // apply_end가 있는 것만 update (null은 그대로 둠)
        const toUpdate = updates.filter(u => u.apply_end !== null);
        const skipped = updates.length - toUpdate.length;
        totalSkipped += skipped;

        if (toUpdate.length > 0) {
            // 개별 update: apply_end 컬럼만 수정 (title 등 NOT NULL 필드 건드리지 않음)
            let batchErrors = 0;
            for (const u of toUpdate) {
                const { error: upErr } = await supabase
                    .from('lectures')
                    .update({ apply_end: u.apply_end })
                    .eq('id', u.id);
                if (upErr) {
                    batchErrors++;
                } else {
                    totalUpdated++;
                }
            }
            if (batchErrors > 0) {
                console.error(`[배치 offset=${offset}] ${batchErrors}건 업데이트 실패`);
            }
        }


        console.log(`[배치 offset=${offset}] 처리 ${data.length}건 → 업데이트 ${toUpdate.length}건, 스킵 ${skipped}건`);

        offset += BATCH_SIZE;
        if (data.length < BATCH_SIZE) hasMore = false;

        await new Promise(r => setTimeout(r, 200)); // API rate limit 방지
    }

    console.log('\n=== 마이그레이션 완료 ===');
    console.log(`총 업데이트: ${totalUpdated}건`);
    console.log(`총 스킵(날짜 없음/상시): ${totalSkipped}건`);
    process.exit(0);
}

migrate();
