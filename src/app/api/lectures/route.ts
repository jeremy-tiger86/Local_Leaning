import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { Lecture } from '@/types/lecture';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        console.log("Fetching lectures from Supabase (bypassing 1000 limit)...");

        // Fetch in parallel chunks of 1000 up to 60000
        const CHUNK_SIZE = 1000;
        const MAX_PAGES = 60;

        const fetchPage = async (pageIndex: number) => {
            const { data, error } = await supabase
                .from('lectures')
                .select('*')
                .range(pageIndex * CHUNK_SIZE, (pageIndex + 1) * CHUNK_SIZE - 1);

            if (error) throw error;
            return data || [];
        };

        const pages = await Promise.all(
            Array.from({ length: MAX_PAGES }, (_, i) => fetchPage(i))
        );

        const data = pages.flat();

        const formatData: Lecture[] = (data || []).map(row => {
            // Keyword-based auto classification if DB category is missing or '일반'
            let category = row.category || '일반';
            const title = (row.title || '').toLowerCase();

            if (category === '일반' || !category) {
                // IT/디지털 (먼저 체크 - 학술 용어 우선 처리)
                if (
                    title.includes('스마트폰') || title.includes('챗gpt') || title.includes('코딩') ||
                    title.includes('프로그래밍') || title.includes('데이터') || title.includes('인공지능') ||
                    title.includes('소프트웨어') || title.includes('파이썬') || title.includes('자바') ||
                    title.includes('엑셀') || title.includes('컴퓨터') || title.includes('블로그') ||
                    title.includes('유튜브') || title.includes('알고리즘') || title.includes('네트워크') ||
                    title.includes('데이터베이스') || title.includes('보안') || title.includes('클라우드') ||
                    title.includes('머신러닝') || title.includes('딥러닝') || title.includes('전자공학') ||
                    title.includes('반도체') || title.includes('임베디드') || title.includes('ict') ||
                    title.includes('시스템프로그래밍') || title.includes('블록체인') || title.includes('메타버스') ||
                    title.includes('웹개발') || title.includes('앱개발') || title.includes('프론트엔드') ||
                    title.includes('백엔드') || title.includes('devops') || title.includes('자료구조') ||
                    title.includes('운영체제') || (title.includes(' ai') || title.includes('[k-mooc] ai')) ||
                    (title.includes(' it') || title.startsWith('[k-mooc] it'))
                ) {
                    category = 'IT/디지털';

                    // 취미/문화
                } else if (
                    title.includes('만들기') || title.includes('공예') || title.includes('요리') ||
                    title.includes('아트') || title.includes('캘리') || title.includes('드로잉') ||
                    title.includes('그림') || title.includes('미술') || title.includes('diy') ||
                    title.includes('제작') || title.includes('음악') || title.includes('악기') ||
                    title.includes('예술') || title.includes('사진') || title.includes('영화') ||
                    title.includes('디자인') || title.includes('뮤지컬') || title.includes('연극') ||
                    title.includes('무용') || title.includes('공연') || title.includes('애니메이션') ||
                    title.includes('조각') || title.includes('시영') || title.includes('게임') ||
                    title.includes('응용미술') || title.includes('미디어아트') || title.includes('서예') ||
                    title.includes('판화') || title.includes('도예') || title.includes('사물놀이')
                ) {
                    category = '취미/문화';

                    // 스포츠/건강
                } else if (
                    title.includes('요가') || title.includes('댄스') || title.includes('수영') ||
                    title.includes('다이빙') || title.includes('스포츠') || title.includes('운동') ||
                    title.includes('건강') || title.includes('체육') || title.includes('피트니스') ||
                    title.includes('필라테스') || title.includes('의학') || title.includes('의료') ||
                    title.includes('간호') || title.includes('보건') || title.includes('영양') ||
                    title.includes('재활') || title.includes('임상') || title.includes('약학') ||
                    title.includes('생체') || title.includes('체력') || title.includes('헬스') ||
                    title.includes('심폐') || title.includes('근골격') || title.includes('식품') ||
                    title.includes('의생명')
                ) {
                    category = '스포츠/건강';

                    // 재테크/자기계발
                } else if (
                    title.includes('부동산') || title.includes('경매') || title.includes('주식') ||
                    title.includes('재테크') || title.includes('창업') || title.includes('자격증') ||
                    title.includes('기사') || title.includes('기능사') || title.includes('지도사') ||
                    title.includes('취업') || title.includes('경영') || title.includes('경제') ||
                    title.includes('마케팅') || title.includes('회계') || title.includes('금융') ||
                    title.includes('비즈니스') || title.includes('리더십') || title.includes('행정') ||
                    title.includes('세무') || title.includes('무역') || title.includes('투자') ||
                    title.includes('보험') || title.includes('연금') || title.includes('기업') ||
                    title.includes('이코노미') || title.includes('고용') || title.includes('인사') ||
                    title.includes('조직') || title.includes('미래직업') || title.includes('스타트업')
                ) {
                    category = '재테크/자기계발';

                    // 인문/교양 (가장 넓은 학문 커버)
                } else if (
                    title.includes('인문') || title.includes('역사') || title.includes('철학') ||
                    title.includes('심리') || title.includes('문학') || title.includes('교양') ||
                    title.includes('언어') || title.includes('영어') || title.includes('중국어') ||
                    title.includes('일본어') || title.includes('한국어') || title.includes('물리') ||
                    title.includes('화학') || title.includes('생물') || title.includes('수학') ||
                    title.includes('통계') || title.includes('법학') || title.includes('사회학') ||
                    title.includes('정치') || title.includes('한국사') || title.includes('세계사') ||
                    title.includes('지구') || title.includes('환경') || title.includes('교육학') ||
                    title.includes('어학') || title.includes('독서') || title.includes('지리') ||
                    title.includes('역학') || title.includes('정치학') || title.includes('모학') ||
                    title.includes('신학') || title.includes('종교') || title.includes('미디어') ||
                    title.includes('저널리즘') || title.includes('언어학') || title.includes('사회')
                ) {
                    category = '인문/교양';
                }
            }

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
                category: category,
                applyEnd: '2026-12-31'
            };
        });

        console.log(`Fetched ${formatData.length} predefined lectures from Supabase.`);

        return NextResponse.json({ success: true, data: formatData });
    } catch (error: unknown) {
        console.error("Supabase Fetch Error:", error);
        return NextResponse.json({ success: false, data: [], message: 'Failed to load from database' }, { status: 500 });
    }
}
