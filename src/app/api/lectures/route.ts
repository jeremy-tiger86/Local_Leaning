import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { Lecture } from '@/types/lecture';

export const dynamic = 'force-dynamic';

// Sido 축약형 매핑
const SIDO_ALIASES: Record<string, string[]> = {
    '서울특별시': ['서울'],
    '인천광역시': ['인천'],
    '대전광역시': ['대전'],
    '대구광역시': ['대구'],
    '광주광역시': ['광주'],
    '부산광역시': ['부산'],
    '울산광역시': ['울산'],
    '세종특별자치시': ['세종'],
    '경기도': ['경기'],
    '강원특별자치도': ['강원'],
    '충청북도': ['충북'],
    '충청남도': ['충남'],
    '전북특별자치도': ['전북', '전라북도'],
    '전라남도': ['전남'],
    '경상북도': ['경북'],
    '경상남도': ['경남'],
    '제주특별자치도': ['제주'],
};

function classifyCategory(title: string): string {
    const t = title.toLowerCase();

    // ① IT/디지털
    if (
        t.includes('스마트폰') || t.includes('챗gpt') || t.includes('코딩') ||
        t.includes('프로그래밍') || t.includes('데이터') || t.includes('인공지능') ||
        t.includes('소프트웨어') || t.includes('파이썬') || t.includes('자바') ||
        t.includes('엑셀') || t.includes('컴퓨터') || t.includes('블로그') ||
        t.includes('유튜브') || t.includes('알고리즘') || t.includes('네트워크') ||
        t.includes('데이터베이스') || t.includes('보안') || t.includes('클라우드') ||
        t.includes('머신러닝') || t.includes('딥러닝') || t.includes('전자공학') ||
        t.includes('반도체') || t.includes('임베디드') || t.includes('ict') ||
        t.includes('블록체인') || t.includes('메타버스') || t.includes('웹개발') ||
        t.includes('앱개발') || t.includes('프론트엔드') || t.includes('백엔드') ||
        t.includes('devops') || t.includes('자료구조') || t.includes('운영체제') ||
        t.includes('디지털') || t.includes('자율주행') || t.includes('항공우주') ||
        t.includes('항공교통') || t.includes('무인항공') || t.includes('이미징') ||
        t.includes('ar/vr') || t.includes(' vr') || t.includes(' ar') ||
        t.includes('xr') || t.includes('모델링') || t.includes('3d') ||
        t.includes('렌더링') || t.includes('실감') ||
        t.includes(' ai') || t.startsWith('ai ') || t.includes('[k-mooc] ai') ||
        t.includes(' it') || t.startsWith('[k-mooc] it')
    ) return 'IT/디지털';

    // ② 취미/문화
    if (
        t.includes('만들기') || t.includes('공예') || t.includes('요리') ||
        t.includes('아트') || t.includes('캘리') || t.includes('드로잉') ||
        t.includes('그림') || t.includes('미술') || t.includes('diy') ||
        t.includes('제작') || t.includes('음악') || t.includes('악기') ||
        t.includes('예술') || t.includes('사진') || t.includes('영화') ||
        t.includes('뮤지컬') || t.includes('연극') || t.includes('무용') ||
        t.includes('공연') || t.includes('애니메이션') || t.includes('조각') ||
        t.includes('게임') || t.includes('응용미술') || t.includes('서예') ||
        t.includes('판화') || t.includes('도예') || t.includes('사물놀이')
    ) return '취미/문화';

    // ③ 스포츠/건강
    if (
        t.includes('요가') || t.includes('댄스') || t.includes('수영') ||
        t.includes('다이빙') || t.includes('스포츠') || t.includes('운동') ||
        t.includes('건강') || t.includes('체육') || t.includes('피트니스') ||
        t.includes('필라테스') || t.includes('의학') || t.includes('의료') ||
        t.includes('간호') || t.includes('보건') || t.includes('영양') ||
        t.includes('재활') || t.includes('임상') || t.includes('약학') ||
        t.includes('생체') || t.includes('헬스') || t.includes('식품') ||
        t.includes('의생명') || t.includes('수상레저') || t.includes('레저') ||
        t.includes('외상') || t.includes('응급') || t.includes('처치술') ||
        t.includes('한의학') || t.includes('삶의 지혜')
    ) return '스포츠/건강';

    // ④ 재테크/자기계발
    if (
        t.includes('부동산') || t.includes('경매') || t.includes('주식') ||
        t.includes('재테크') || t.includes('창업') || t.includes('자격증') ||
        t.includes('기사') || t.includes('기능사') || t.includes('지도사') ||
        t.includes('취업') || t.includes('경영') || t.includes('경제') ||
        t.includes('마케팅') || t.includes('회계') || t.includes('금융') ||
        t.includes('비즈니스') || t.includes('리더십') || t.includes('행정') ||
        t.includes('세무') || t.includes('무역') || t.includes('투자') ||
        t.includes('보험') || t.includes('연금') || t.includes('기업') ||
        t.includes('이코노미') || t.includes('고용') || t.includes('인사') ||
        t.includes('조직') || t.includes('미래직업') || t.includes('스타트업')
    ) return '재테크/자기계발';

    // ⑤ 인문/교양
    if (
        t.includes('인문') || t.includes('역사') || t.includes('철학') ||
        t.includes('심리') || t.includes('문학') || t.includes('교양') ||
        t.includes('언어') || t.includes('영어') || t.includes('중국어') ||
        t.includes('일본어') || t.includes('한국어') || t.includes('물리') ||
        t.includes('화학') || t.includes('생물') || t.includes('수학') ||
        t.includes('통계') || t.includes('법학') || t.includes('사회학') ||
        t.includes('정치') || t.includes('한국사') || t.includes('세계사') ||
        t.includes('지구') || t.includes('환경') || t.includes('교육학') ||
        t.includes('어학') || t.includes('독서') || t.includes('지리') ||
        t.includes('정치학') || t.includes('행정학') || t.includes('신학') ||
        t.includes('종교') || t.includes('미디어') || t.includes('저널리즘') ||
        t.includes('언어학') || t.includes('사회') || t.includes('동양') ||
        t.includes('병법') || t.includes('우주')
    ) return '인문/교양';

    return '일반';
}

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const type = url.searchParams.get('type') || 'offline';
        const sido = url.searchParams.get('sido') || '';
        const sigungu = url.searchParams.get('sigungu') || '';

        let query = supabase.from('lectures').select('*');

        if (type === 'online') {
            // 온라인: address에 '온라인' 포함 OR kmooc.kr 링크
            query = query.or('address.ilike.%온라인%, link.ilike.%kmooc.kr%');
        } else {
            // 오프라인: sido로 필터 + 온라인 주소 제외
            if (sido) {
                // sido의 축약형도 포함하여 OR 검색
                const aliases = [sido, ...(SIDO_ALIASES[sido] || [])];
                const orConditions = aliases.map(a => `address.ilike.%${a}%`).join(',');
                query = query.or(orConditions);
            }
            // 온라인 주소 제외
            query = query.not('address', 'ilike', '%온라인%');

            // sigungu 필터 ('전체'가 아닐 때만)
            if (sigungu && sigungu !== '전체') {
                query = query.ilike('address', `%${sigungu}%`);
            }

            // 오프라인은 최대 5,000건 (시도 단위 전체도 커버 가능)
            query = query.limit(5000);
        }

        const { data, error } = await query;

        if (error) throw error;

        const formatData: Lecture[] = (data || []).map(row => {
            const dbCategory = row.category || '일반';
            const category = (dbCategory === '일반' || !dbCategory)
                ? classifyCategory(row.title || '')
                : dbCategory;

            return {
                id: row.id,
                title: row.title,
                instructor: row.instructor,
                period: row.period,
                target: row.target,
                link: row.link,
                lat: row.lat,
                lng: row.lng,
                address: row.address,
                isFree: row.is_free,
                price: row.price,
                category,
                applyEnd: '2026-12-31',
            };
        });

        console.log(`[/api/lectures] type=${type} sido=${sido} sigungu=${sigungu} → ${formatData.length}건`);
        return NextResponse.json({ success: true, data: formatData });

    } catch (error: unknown) {
        console.error('Supabase Fetch Error:', error);
        return NextResponse.json({ success: false, data: [], message: 'Failed to load from database' }, { status: 500 });
    }
}
