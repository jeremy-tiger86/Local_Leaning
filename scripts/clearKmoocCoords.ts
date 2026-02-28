import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function clearKmoocCoords() {
    console.log('K-MOOC 강좌 좌표 초기화를 시작합니다...');

    // KMOOC_ 로 시작하는 모든 강좌의 lat, lng를 null로 업데이트
    const { data, error, count } = await supabase
        .from('lectures')
        .update({ lat: null, lng: null })
        .like('id', 'KMOOC_%')
        .select('id');

    if (error) {
        console.error('업데이트 오류:', error);
        process.exit(1);
    }

    console.log(`✅ 완료! ${data?.length ?? 0}개의 K-MOOC 강좌 좌표가 null로 초기화되었습니다.`);
    process.exit(0);
}

clearKmoocCoords();
