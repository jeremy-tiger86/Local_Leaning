import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const kakaoApiKey = process.env.KAKAO_REST_API_KEY || process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const CATEGORY_MAP: Record<string, string[]> = {
    'IT/디지털': ['코딩', '컴퓨터', '스마트폰', '인공지능', '엑셀', '디지털', '영상편집', 'IT', '유튜브', '파이썬', '프로그래밍'],
    '취미/문화': ['미술', '음악', '바둑', '요리', '캘리그라피', '사진', '공예', '노래', '악기', '댄스', '무용', '영화', '원예'],
    '재테크/자기계발': ['재테크', '부동산', '주식', '창업', '자격증', '영어', '일본어', '중국어', '취업', '마케팅', '리더십', '회계'],
    '인문/교양': ['인문학', '철학', '역사', '심리', '동양학', '서양학', '문학', '고전', '명리', '시민교육'],
    '스포츠/건강': ['요가', '필라테스', '스트레칭', '탁구', '배드민턴', '댄스스포츠', '에어로빅', '수영', '헬스', '태권도', '건강']
};

function classifyCategory(title: string): string {
    for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
        if (keywords.some(kw => title.includes(kw))) {
            return category;
        }
    }
    return '기타';
}

function parseEndDate(period: string): Date | null {
    if (!period) return null;
    const parts = period.split('~');
    if (parts.length < 2) return null;
    const endStr = parts[1].trim();
    const date = new Date(endStr);
    return isNaN(date.getTime()) ? null : date;
}

async function geocodeAddress(address: string) {
    if (!address || address.includes('온라인') || address.includes('비대면') || address.includes('줌') || address.includes('Zoom')) return null;

    const cleanAddress = address.split('(')[0].split(',')[0].trim();
    if (cleanAddress.length < 5) return null;

    try {
        const response = await fetch(
            `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(cleanAddress)}`,
            {
                headers: { Authorization: `KakaoAK ${kakaoApiKey}` },
            }
        );

        if (!response.ok) return null;

        const data: any = await response.json();
        if (data.documents && data.documents.length > 0) {
            const { x, y, address: addrInfo } = data.documents[0];
            return {
                lat: parseFloat(y),
                lng: parseFloat(x),
                sido: addrInfo?.region_1depth_name || null,
                sigungu: addrInfo?.region_2depth_name || null
            };
        }
    } catch (error) { }
    return null;
}

async function main() {
    console.log('--- Phase 1: 운영 중인 오프라인 강좌 우선 지오코딩 및 카테고리 분류 ---');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. 운영 중인 오프라인 강좌 가져오기 (lat이 없는 것 우선)
    const { data: lectures, error } = await supabase
        .from('lectures')
        .select('*')
        .like('id', 'STD_%')
        .is('lat', null);

    if (error) { console.error(error); return; }

    const activeLectures = lectures.filter(it => {
        const endDate = parseEndDate(it.period);
        return endDate && endDate >= today;
    });

    console.log(`운영 중인 오프라인 강좌 수(좌표 미보유): ${activeLectures.length}건`);

    let success = 0;
    let fail = 0;

    for (const lecture of activeLectures) {
        const category = classifyCategory(lecture.title);
        const coords = await geocodeAddress(lecture.address);

        const updateData: any = { category };
        if (coords) {
            updateData.lat = coords.lat;
            updateData.lng = coords.lng;
            updateData.sido = coords.sido;
            updateData.sigungu = coords.sigungu;
            success++;
        } else {
            fail++;
        }

        await supabase.from('lectures').update(updateData).eq('id', lecture.id);

        if ((success + fail) % 50 === 0) {
            console.log(`Progress: ${success + fail}/${activeLectures.length} (Success: ${success}, Fail: ${fail})`);
        }
        await new Promise(r => setTimeout(r, 20));
    }

    console.log('\n--- Phase 2: 온라인 강좌 카테고리 분류 ---');
    const { data: onlineLectures } = await supabase.from('lectures').select('id, title').like('id', 'KMOOC_%');
    if (onlineLectures) {
        console.log(`온라인 강좌 분류 중: ${onlineLectures.length}건`);
        for (const lecture of onlineLectures) {
            const category = classifyCategory(lecture.title);
            await supabase.from('lectures').update({ category }).eq('id', lecture.id);
        }
    }

    console.log('\n모든 작업 완료!');
}

main();
