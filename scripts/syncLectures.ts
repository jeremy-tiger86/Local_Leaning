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

const standardBaseUrl = 'http://api.data.go.kr/openapi/tn_pubr_public_lftm_lrn_lctre_api';
const NUM_OF_ROWS = 1000;

async function syncLectures() {
    let pageNo = 1;
    let totalCount = 0;
    let hasMore = true;

    console.log('Starting data synchronization...');

    while (hasMore) {
        const url = `${standardBaseUrl}?serviceKey=${API_KEY}&pageNo=${pageNo}&numOfRows=${NUM_OF_ROWS}&type=json`;
        try {
            console.log(`Fetching page ${pageNo}...`);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const textData = await response.text();
            // Handle HTML error responses from API gateway
            if (textData.startsWith('<')) {
                console.error('API returned XML or HTML instead of JSON. Stopping.');
                break;
            }

            const data = JSON.parse(textData);
            const items = data.response?.body?.items || [];

            if (items.length === 0) {
                hasMore = false;
                break;
            }

            const formattedLectures = items.map((item: any) => {
                // Jitter lat/lng randomly around Seoul (37.5665, 126.9780) for testing
                // Real app should use Naver/Kakao geocoding for `item.edcRdnmadr`
                const latJitter = 37.5665 + (Math.random() - 0.5) * 0.5;
                const lngJitter = 126.9780 + (Math.random() - 0.5) * 0.5;

                // Date logic
                const applyEnd = (item.rceptEndDate && new Date(item.rceptEndDate) < new Date())
                    ? '2026-12-31'
                    : (item.rceptEndDate || null);

                return {
                    id: `STD_${item.insttNm || 'UKN'}_${item.lctreNm}_${Math.random().toString(36).substr(2, 5)}`,
                    title: item.lctreNm || '제목 없음',
                    instructor: item.instrctrNm || '강사 미상',
                    period: `${item.edcStartDay || ''} ~ ${item.edcEndDay || ''}`,
                    target: item.edcTrgetType || '누구나',
                    link: item.homepageUrl || '',
                    lat: latJitter,
                    lng: lngJitter,
                    address: item.edcRdnmadr || item.edcPlace || '장소 미상',
                    is_free: (item.lctreCost === '0'),
                    price: item.lctreCost === '0' ? '무료' : (item.lctreCost ? `${item.lctreCost}원` : '무료')
                };
            });

            // Upsert to Supabase
            const { error } = await supabase
                .from('lectures')
                .upsert(formattedLectures, { onConflict: 'id' });

            if (error) {
                console.error(`Supabase Upsert Error on page ${pageNo}:`, error);
            } else {
                totalCount += formattedLectures.length;
                console.log(`Successfully upserted ${formattedLectures.length} items from page ${pageNo}. Total: ${totalCount}`);
            }

            // If we got exactly the number we asked for, there might be more. Otherwise, we are done.
            if (items.length < NUM_OF_ROWS) {
                hasMore = false;
            } else {
                pageNo++;
            }

            // Be nice to the API
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (err) {
            console.error(`Error processing page ${pageNo}:`, err);
            hasMore = false;
        }
    }

    console.log(`\nSync complete! Total lectures synced: ${totalCount}`);
    process.exit(0);
}

syncLectures();
