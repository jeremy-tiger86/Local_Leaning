import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const API_KEY = process.env.NEXT_PUBLIC_DATA_PORTAL_KEY || process.env.DATA_PORTAL_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}
if (!API_KEY) {
    console.error('Missing 공공데이터포털 API key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * period 문자열에서 종료일을 파싱하여 YYYY-MM-DD 반환
 * 예: "2026-01-01 ~ 2026-03-31" → "2026-03-31"
 */
function parseApplyEnd(period: string | null | undefined): string | null {
    if (!period || period === '상시') return null;
    const parts = period.split('~');
    if (parts.length < 2) return null;
    const endStr = parts[1].trim().replace(/\./g, '-');
    if (!endStr.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
    const d = new Date(endStr);
    return isNaN(d.getTime()) ? null : endStr;
}

const standardBaseUrl = 'http://api.data.go.kr/openapi/tn_pubr_public_lftm_lrn_lctre_api';
const kmoocBaseUrl = 'https://apis.data.go.kr/B552881/kmooc_v2_0/courseList_v2_0';
const NUM_OF_ROWS = 1000;

function generateJitter() {
    // Jitter lat/lng randomly around Seoul (37.5665, 126.9780) for testing
    const lat = 37.5665 + (Math.random() - 0.5) * 0.5;
    const lng = 126.9780 + (Math.random() - 0.5) * 0.5;
    return { lat, lng };
}

async function fetchKmoocData() {
    let pageNo = 1;
    let totalCount = 0;
    let hasMore = true;

    console.log('--- Starting K-MOOC data synchronization ---');

    while (hasMore) {
        const url = `${kmoocBaseUrl}?serviceKey=${API_KEY}&MobileOS=ETC&MobileApp=LocalLeaning&page=${pageNo}&numOfRows=100`;
        try {
            console.log(`[K-MOOC] Fetching page ${pageNo}...`);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`[K-MOOC] HTTP error! status: ${response.status}`);
            }

            const textData = await response.text();
            if (textData.startsWith('<')) {
                console.error('[K-MOOC] API returned XML or HTML instead of JSON. Stopping.');
                break;
            }

            const data = JSON.parse(textData);
            const items = data.items || [];

            if (items.length === 0) {
                hasMore = false;
                break;
            }

            const formattedLectures = items.map((item: any) => {
                // Convert timestamp to YYYY-MM-DD
                const formatTimestamp = (ts: string) => {
                    if (!ts) return '';
                    const date = new Date(parseInt(ts) * 1000); // K-MOOC uses Unix timestamp in seconds
                    return date.toISOString().split('T')[0];
                };

                const studyStart = formatTimestamp(item.study_start);
                const studyEnd = formatTimestamp(item.study_end);
                const period = (studyStart && studyEnd) ? `${studyStart} ~ ${studyEnd}` : '상시';

                return {
                    id: `KMOOC_${item.id}`,
                    title: `[K-MOOC] ${item.name}`,
                    instructor: item.professor || 'K-MOOC 강사',
                    period: period,
                    target: '온라인 수강가능 대상자',
                    link: item.url || 'http://www.kmooc.kr/',
                    lat: null,
                    lng: null,
                    address: '온라인 강좌',
                    is_free: true,
                    price: '무료',
                    apply_end: parseApplyEnd(period),
                };
            });

            const { error } = await supabase
                .from('lectures')
                .upsert(formattedLectures, { onConflict: 'id' });

            if (error) {
                console.error(`[K-MOOC] Supabase Upsert Error on page ${pageNo}:`, error);
            } else {
                totalCount += formattedLectures.length;
                console.log(`[K-MOOC] Successfully upserted ${formattedLectures.length} items from page ${pageNo}. Total: ${totalCount}`);
            }

            // K-MOOC API seems to ignore numOfRows and always returns size=15 per page.
            // Check totalCount from header to know when to stop.
            const totalItemsCount = data.header?.totalCount || data.totalCount || 0;
            if (totalCount >= totalItemsCount || items.length === 0) {
                hasMore = false;
            } else {
                pageNo++;
            }

            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (err) {
            console.error(`[K-MOOC] Error processing page ${pageNo}:`, err);
            hasMore = false;
        }
    }

    console.log(`\n[K-MOOC] Sync complete! Total lectures synced: ${totalCount}`);
    return totalCount;
}

async function fetchPublicData() {
    let pageNo = 1;
    let totalCount = 0;
    let hasMore = true;

    console.log('--- Starting Standard Public data synchronization ---');

    while (hasMore) {
        const url = `${standardBaseUrl}?serviceKey=${API_KEY}&pageNo=${pageNo}&numOfRows=${NUM_OF_ROWS}&type=json`;
        try {
            console.log(`[Public] Fetching page ${pageNo}...`);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`[Public] HTTP error! status: ${response.status}`);
            }

            const textData = await response.text();
            if (textData.startsWith('<')) {
                console.error('[Public] API returned XML or HTML instead of JSON. Stopping.');
                break;
            }

            const data = JSON.parse(textData);
            const items = data.response?.body?.items || [];

            if (items.length === 0) {
                hasMore = false;
                break;
            }

            const formattedLectures = items.map((item: any) => {
                // ★ 결정론적 ID: 직충명 + 강좌명 + 시작일 + 종료일 조합
                const baseId = [
                    item.insttNm || 'UKN',
                    item.lctreNm || 'NO_LECTURE',
                    item.edcStartDay || 'NO_START',
                    item.edcEndDay || 'NO_END',
                ].join('_').replace(/\s+/g, '_').substring(0, 200);

                const period = `${item.edcStartDay || ''} ~ ${item.edcEndDay || ''}`;
                return {
                    id: `STD_${baseId}`,
                    title: item.lctreNm || '제목 없음',
                    instructor: item.instrctrNm || '강사 미상',
                    period: period,
                    target: item.edcTrgetType || '누구나',
                    link: item.homepageUrl || '',
                    lat: null,  // geocoding 스크립트로 나중에 실제 주소 반영
                    lng: null,
                    address: item.edcRdnmadr || item.edcPlace || '장소 미상',
                    is_free: (item.lctreCost === '0'),
                    price: item.lctreCost === '0' ? '무료' : (item.lctreCost ? `${item.lctreCost}원` : '무료'),
                    apply_end: parseApplyEnd(period),
                };
            });

            // ★ 배치 내 중복 ID 제거 (동일한 ID가 한 배치에 있으면 Supabase 21000 에러 발생)
            const uniqueLectures = Array.from(
                new Map(formattedLectures.map(item => [item.id, item])).values()
            );

            const { error } = await supabase
                .from('lectures')
                .upsert(uniqueLectures, { onConflict: 'id' });

            if (error) {
                console.error(`[Public] Supabase Upsert Error on page ${pageNo}:`, error);
                // 중대한 에러(네트워크 등)일 수 있으므로 일단 중단하지는 않되 로그는 남김
            } else {
                totalCount += uniqueLectures.length;
                console.log(`[Public] Successfully upserted ${uniqueLectures.length} items from page ${pageNo}. Total: ${totalCount}`);
            }

            if (items.length < NUM_OF_ROWS) {
                hasMore = false;
            } else {
                pageNo++;
            }

            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (err) {
            console.error(`[Public] Error processing page ${pageNo}:`, err);
            hasMore = false;
        }
    }

    console.log(`\n[Public] Sync complete! Total lectures synced: ${totalCount}`);
    return totalCount;
}

async function syncAll() {
    console.log('Starting full data synchronization pipeline...');
    let totalSynced = 0;

    // 1. K-MOOC Data Sync
    const kmoocCount = await fetchKmoocData();
    totalSynced += kmoocCount;

    // 2. Public Data Sync
    const publicCount = await fetchPublicData();
    totalSynced += publicCount;

    console.log(`\n=================================================`);
    console.log(`Full Sync Pipeline Complete!`);
    console.log(`- K-MOOC Data: ${kmoocCount}`);
    console.log(`- Public Data: ${publicCount}`);
    console.log(`- Total Inserted/Updated: ${totalSynced}`);
    console.log(`=================================================`);

    process.exit(0);
}

syncAll();
