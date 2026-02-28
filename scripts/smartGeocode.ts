/**
 * smartGeocode.ts
 * 
 * 오늘 기준 운영 중인 오프라인 강좌 중 좌표(lat/lng)가 없는 건에 대해
 * 스마트 지오코딩을 수행합니다.
 * 
 * 처리 흐름 (5단계):
 *   1단계: DB에서 동일 주소를 가진 강좌의 좌표 참조 (가장 빠름)
 *   2단계: DB에서 동일 강사명 강좌의 좌표 참조
 *   3단계: address 필드로 카카오 API 검색
 *   4단계: title에서 기관명 키워드 추출 후 카카오 API 검색
 *   5단계: title/address에서 시/도 추출 → 시/도 중심 좌표 적용 (최소 보장)
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY || process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Supabase 환경변수 누락'); process.exit(1); }
if (!KAKAO_KEY) { console.error('KAKAO_REST_API_KEY 환경변수 누락'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

// 시/도별 중심 좌표 (5단계 fallback)
const SIDO_CENTER: Record<string, { lat: number; lng: number }> = {
    '서울': { lat: 37.5665, lng: 126.9780 },
    '부산': { lat: 35.1796, lng: 129.0756 },
    '대구': { lat: 35.8714, lng: 128.6014 },
    '인천': { lat: 37.4563, lng: 126.7052 },
    '광주': { lat: 35.1595, lng: 126.8526 },
    '대전': { lat: 36.3504, lng: 127.3845 },
    '울산': { lat: 35.5384, lng: 129.3114 },
    '세종': { lat: 36.4801, lng: 127.2890 },
    '경기': { lat: 37.4138, lng: 127.5183 },
    '강원': { lat: 37.8228, lng: 128.1555 },
    '충북': { lat: 36.6358, lng: 127.4914 },
    '충남': { lat: 36.5184, lng: 126.8000 },
    '전북': { lat: 35.7175, lng: 127.1530 },
    '전남': { lat: 34.8679, lng: 126.9910 },
    '경북': { lat: 36.4919, lng: 128.8889 },
    '경남': { lat: 35.4606, lng: 128.2132 },
    '제주': { lat: 33.4996, lng: 126.5312 },
};

// 기관명 키워드 (4단계에서 title 파싱 시 사용)
const INSTITUTION_KEYWORDS = [
    '구청', '시청', '군청', '도청',
    '도서관', '평생학습관', '평생학습센터', '문화원', '문화센터',
    '복지관', '종합사회복지관', '주민센터', '자활센터',
    '교육청', '교육지원청',
    '체육관', '스포츠센터',
    '여성회관', '청소년센터', '노인복지관',
];

/** 카카오 지오코딩 (주소 검색 → 키워드 검색 순) */
async function kakaoGeocode(query: string): Promise<{ lat: number; lng: number } | null> {
    // 1차: 주소 검색
    const addrUrl = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=1`;
    try {
        const res = await fetch(addrUrl, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
        const data = await res.json() as any;
        if (data.documents?.length > 0) {
            return { lat: parseFloat(data.documents[0].y), lng: parseFloat(data.documents[0].x) };
        }
    } catch { /* ignore */ }

    // 2차: 키워드 검색
    const kwUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
    try {
        const res = await fetch(kwUrl, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
        const data = await res.json() as any;
        if (data.documents?.length > 0) {
            return { lat: parseFloat(data.documents[0].y), lng: parseFloat(data.documents[0].x) };
        }
    } catch { /* ignore */ }

    return null;
}

/** title에서 기관명 추출 */
function extractInstitution(title: string): string | null {
    for (const kw of INSTITUTION_KEYWORDS) {
        const idx = title.indexOf(kw);
        if (idx !== -1) {
            const start = Math.max(0, idx - 10);
            return title.substring(start, idx + kw.length).trim();
        }
    }
    return null;
}

/** address 또는 title에서 시/도 추출 */
function extractSido(text: string): string | null {
    for (const key of Object.keys(SIDO_CENTER)) {
        if (text.includes(key)) return key;
    }
    return null;
}

async function smartGeocode() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`=== 스마트 지오코딩 시작 (기준일: ${today}) ===`);

    // 처리 대상: 오늘 기준 운영 중 + 오프라인 + 좌표 없는 강좌
    const { data: targets, error } = await supabase
        .from('lectures')
        .select('id, title, address, instructor')
        .not('address', 'ilike', '%온라인%')
        .is('lat', null)
        .or(`apply_end.gte.${today},apply_end.is.null`)
        .limit(2000);

    if (error) { console.error('조회 오류:', error); process.exit(1); }
    if (!targets || targets.length === 0) {
        console.log('✅ 처리할 강좌 없음 (모두 좌표 보유)');
        process.exit(0);
    }

    // ★ DB 좌표 캐시: 동일 주소 또는 동일 강사의 좌표를 미리 로드
    console.log(`처리 대상: ${targets.length}건 → DB 유사 건 좌표 캐시 로딩 중...`);

    // 주소 목록 수집 (중복 제거, '장소 미상' 제외)
    const addressList = [...new Set(
        targets
            .map(r => r.address)
            .filter(a => a && a !== '장소 미상')
    )];

    // 강사명 목록 수집 (중복 제거, '강사 미상' 제외)
    const instructorList = [...new Set(
        targets
            .map(r => r.instructor)
            .filter(i => i && i !== '강사 미상')
    )];

    // DB에서 동일 주소를 가진 강좌 중 좌표 있는 건 조회
    const addrCoordMap: Record<string, { lat: number; lng: number }> = {};
    if (addressList.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < addressList.length; i += batchSize) {
            const batch = addressList.slice(i, i + batchSize);
            for (const addr of batch) {
                const { data } = await supabase
                    .from('lectures')
                    .select('lat, lng')
                    .eq('address', addr)
                    .not('lat', 'is', null)
                    .limit(1)
                    .single();
                if (data?.lat && data?.lng) {
                    addrCoordMap[addr] = { lat: data.lat, lng: data.lng };
                }
            }
        }
    }
    console.log(`주소 기준 DB 캐시: ${Object.keys(addrCoordMap).length}건 확보`);

    // DB에서 동일 강사명을 가진 강좌 중 좌표 있는 건 조회
    const instrCoordMap: Record<string, { lat: number; lng: number }> = {};
    if (instructorList.length > 0) {
        for (const instr of instructorList) {
            const { data } = await supabase
                .from('lectures')
                .select('lat, lng')
                .eq('instructor', instr)
                .not('lat', 'is', null)
                .limit(1)
                .single();
            if (data?.lat && data?.lng) {
                instrCoordMap[instr] = { lat: data.lat, lng: data.lng };
            }
        }
    }
    console.log(`강사 기준 DB 캐시: ${Object.keys(instrCoordMap).length}건 확보\n`);

    let s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0, failed = 0;

    for (const row of targets) {
        let coords: { lat: number; lng: number } | null = null;
        let method = '';

        // ★ 1단계: DB 동일 주소 좌표 참조
        if (row.address && addrCoordMap[row.address]) {
            coords = addrCoordMap[row.address];
            method = '1단계(DB 동일주소)';
            s1++;
        }

        // ★ 2단계: DB 동일 강사명 좌표 참조
        if (!coords && row.instructor && instrCoordMap[row.instructor]) {
            coords = instrCoordMap[row.instructor];
            method = '2단계(DB 동일강사)';
            s2++;
        }

        // 3단계: address로 카카오 API
        if (!coords && row.address && row.address !== '장소 미상') {
            coords = await kakaoGeocode(row.address);
            if (coords) { method = '3단계(카카오 주소)'; s3++; }
            await new Promise(r => setTimeout(r, 150));
        }

        // 4단계: title 기관명 추출 후 카카오 API
        if (!coords && row.title) {
            const institution = extractInstitution(row.title);
            if (institution) {
                coords = await kakaoGeocode(institution);
                if (coords) { method = `4단계(기관명:${institution})`; s4++; }
                await new Promise(r => setTimeout(r, 150));
            }
        }

        // 5단계: 시/도 중심 좌표 fallback
        if (!coords) {
            const text = `${row.title} ${row.address}`;
            const sido = extractSido(text);
            if (sido) {
                coords = SIDO_CENTER[sido];
                method = `5단계(시도중심:${sido})`;
                s5++;
            }
        }

        if (coords) {
            const { error: upErr } = await supabase
                .from('lectures')
                .update({ lat: coords.lat, lng: coords.lng })
                .eq('id', row.id);

            if (upErr) {
                console.error(`[${row.id}] 업데이트 오류:`, upErr);
                failed++;
            } else {
                console.log(`✅ [${method}] ${(row.title || '').substring(0, 35)}`);
            }
        } else {
            console.log(`❌ [실패] ${(row.title || '').substring(0, 35)} | ${row.address}`);
            failed++;
        }
    }

    console.log('\n=== 스마트 지오코딩 완료 ===');
    console.log(`1단계 (DB 동일주소):  ${s1}건`);
    console.log(`2단계 (DB 동일강사):  ${s2}건`);
    console.log(`3단계 (카카오 주소):  ${s3}건`);
    console.log(`4단계 (기관명):       ${s4}건`);
    console.log(`5단계 (시도중심):     ${s5}건`);
    console.log(`실패:                 ${failed}건`);
    console.log(`총 처리:              ${s1 + s2 + s3 + s4 + s5 + failed}건`);
    process.exit(0);
}

smartGeocode();
