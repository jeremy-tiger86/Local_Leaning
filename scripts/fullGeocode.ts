import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const kakaoApiKey = process.env.KAKAO_REST_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function geocodeAddress(address: string) {
    if (!address || address.includes('온라인')) return null;

    const cleanAddress = address.split('(')[0].split(',')[0].trim();
    if (cleanAddress.length < 5) return null;

    try {
        const response = await fetch(
            `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(cleanAddress)}`,
            {
                headers: {
                    Authorization: `KakaoAK ${kakaoApiKey}`,
                },
            }
        );

        if (!response.ok) return null;

        const data = await response.json();
        if (data.documents && data.documents.length > 0) {
            const { x, y } = data.documents[0];
            return {
                lat: parseFloat(y),
                lng: parseFloat(x),
            };
        }
    } catch (error) {
        // silent
    }
    return null;
}

async function main() {
    console.log('Starting FINAL FULL geocoding process (No Limits)...');

    const CHUNK_SIZE = 1000;
    let page = 0;
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFail = 0;

    while (true) {
        console.log(`Fetching next ${CHUNK_SIZE} lectures with missing coordinates...`);
        const { data: lectures, error } = await supabase
            .from('lectures')
            .select('id, address')
            .is('lat', null) // ★ 좌표가 없는 것만!
            .not('address', 'ilike', '%온라인%')
            .order('id')
            .limit(CHUNK_SIZE);

        if (error) {
            console.error('Error fetching lectures:', error);
            break;
        }
        if (!lectures || lectures.length === 0) {
            console.log('No more lectures to fetch.');
            break;
        }

        console.log(`Processing batch of ${lectures.length} lectures...`);

        for (const lecture of lectures) {
            const coords = await geocodeAddress(lecture.address);
            if (coords) {
                const { error: updateError } = await supabase
                    .from('lectures')
                    .update({ lat: coords.lat, lng: coords.lng })
                    .eq('id', lecture.id);

                if (!updateError) {
                    totalSuccess++;
                } else {
                    totalFail++;
                }
            } else {
                totalFail++;
            }
            totalProcessed++;

            if (totalProcessed % 100 === 0) {
                console.log(`Progress: ${totalProcessed} processed. Success: ${totalSuccess}, Fail: ${totalFail}`);
            }

            // Kakao API rate limit & Supabase load balancing - slightly tuned for performance while remaining safe
            await new Promise(resolve => setTimeout(resolve, 15));
        }

        page++;
    }

    console.log('--------------------------------------------------');
    console.log('WHOLE DATABASE GEOCODING COMPLETE!');
    console.log(`Total Processed: ${totalProcessed}`);
    console.log(`Total Success: ${totalSuccess}`);
    console.log(`Total Fail: ${totalFail}`);
    console.log('--------------------------------------------------');
}

main();
