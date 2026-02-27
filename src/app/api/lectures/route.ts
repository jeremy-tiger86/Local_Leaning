import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { Lecture } from '@/types/lecture';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        console.log("Fetching lectures from Supabase (bypassing 1000 limit)...");

        // Fetch in parallel chunks of 1000 up to 30000
        const CHUNK_SIZE = 1000;
        const MAX_PAGES = 30;

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
                if (title.includes('만들기') || title.includes('공예') || title.includes('요리') || title.includes('아트') || title.includes('캘리') || title.includes('드로잉') || title.includes('그림') || title.includes('미술') || title.includes('diy') || title.includes('제작')) {
                    category = '취미/문화';
                } else if (title.includes('요가') || title.includes('댄스') || title.includes('수영') || title.includes('다이빙') || title.includes('스포츠') || title.includes('운동') || title.includes('건강') || title.includes('체육') || title.includes('피트니스') || title.includes('필라테스')) {
                    category = '스포츠/건강';
                } else if (title.includes('인문') || title.includes('역사') || title.includes('철학') || title.includes('심리') || title.includes('문학') || title.includes('교양') || title.includes('언어') || title.includes('영어') || title.includes('중국어') || title.includes('일본어')) {
                    category = '인문/교양';
                } else if (title.includes('부동산') || title.includes('경매') || title.includes('주식') || title.includes('재테크') || title.includes('창업') || title.includes('자격증') || title.includes('기사') || title.includes('기능사') || title.includes('지도사') || title.includes('취업')) {
                    category = '재테크/자기계발';
                } else if (title.includes('스마트폰') || title.includes('챗gpt') || title.includes('코딩') || title.includes('프로그래밍') || title.includes('it') || title.includes('데이터') || title.includes('ai') || title.includes('인공지능') || title.includes('소프트웨어') || title.includes('파이썬') || title.includes('컴퓨터')) {
                    category = 'IT/디지털';
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

