import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function classifyCategory(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('스마트폰') || t.includes('코딩') || t.includes('프로그래밍') || t.includes('데이터') ||
        t.includes('인공지능') || t.includes('알고리즘') || t.includes('네트워크') || t.includes('머신러닝') ||
        t.includes('딥러닝') || t.includes('전자공학') || t.includes('반도체') || t.includes('ict') ||
        t.includes('블록체인') || t.includes('디지털') || t.includes('자율주행') || t.includes('항공우주') ||
        t.includes('항공교통') || t.includes('무인항공') || t.includes('이미징') || t.includes('ar/vr') ||
        t.includes('vr') || t.includes('모델링') || t.includes('3d') || t.includes('실감') ||
        t.includes(' ai') || t.includes(' it')) return 'IT/디지털';
    if (t.includes('음악') || t.includes('예술') || t.includes('영화') || t.includes('미술') ||
        t.includes('드로잉') || t.includes('사진') || t.includes('무용') || t.includes('디자인') ||
        t.includes('게임') || t.includes('공연') || t.includes('애니메이션')) return '취미/문화';
    if (t.includes('의학') || t.includes('간호') || t.includes('보건') || t.includes('건강') ||
        t.includes('영양') || t.includes('재활') || t.includes('약학') || t.includes('수상레저') ||
        t.includes('외상') || t.includes('응급') || t.includes('한의학') || t.includes('스포츠')) return '스포츠/건강';
    if (t.includes('경영') || t.includes('경제') || t.includes('마케팅') || t.includes('금융') ||
        t.includes('창업') || t.includes('취업') || t.includes('스타트업') || t.includes('리더십')) return '재테크/자기계발';
    if (t.includes('인문') || t.includes('역사') || t.includes('철학') || t.includes('심리') ||
        t.includes('문학') || t.includes('언어') || t.includes('영어') || t.includes('물리') ||
        t.includes('화학') || t.includes('수학') || t.includes('통계') || t.includes('법학') ||
        t.includes('사회') || t.includes('정치') || t.includes('동양') || t.includes('병법') ||
        t.includes('우주') || t.includes('지혜')) return '인문/교양';
    return '일반';
}

async function diagnose() {
    console.log('=== 온라인 강좌 카테고리 분류 현황 진단 ===\n');

    const { data, error } = await supabase
        .from('lectures')
        .select('id, title, address, link')
        .or('address.ilike.%온라인%,link.ilike.%kmooc.kr%');

    if (error) { console.error(error); process.exit(1); }

    console.log(`총 온라인 강좌: ${data?.length}개\n`);

    const catMap: Record<string, string[]> = {};
    data?.forEach((d: any) => {
        const cat = classifyCategory(d.title);
        if (!catMap[cat]) catMap[cat] = [];
        catMap[cat].push(d.title);
    });

    Object.entries(catMap).forEach(([cat, titles]) => {
        console.log(`[${cat}] - ${titles.length}개`);
        titles.forEach(t => console.log(`  - ${t}`));
        console.log('');
    });

    process.exit(0);
}

diagnose();
