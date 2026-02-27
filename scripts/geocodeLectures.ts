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

    // 주소에서 불필요한 부분 제거 (예: 괄호 안의 메모, 상세주소 등)
    // 카카오 API는 도로명이나 지번까지만 있는 것이 가장 정확함
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

        const data = await response.json();
        if (data.documents && data.documents.length > 0) {
            const { x, y } = data.documents[0];
            return {
                lat: parseFloat(y),
                lng: parseFloat(x),
            };
        }
    } catch (error) {
        console.error(`Geocoding error for ${address}:`, error);
    }
    return null;
}

async function main() {
    console.log('Starting geocoding process (Full Sync)...');

    // 위경도가 서울 근처로 지터링된 데이터나 0인 데이터 모두 재좌표화
    // 온라인 강의는 제외
    const { data: lectures, error } = await supabase
        .from('lectures')
        .select('id, address')
        .not('address', 'ilike', '%온라인%');

    if (error) {
        console.error('Error fetching lectures:', error);
        return;
    }

    console.log(`Found ${lectures?.length || 0} offline lectures to geocode.`);

    if (!lectures || lectures.length === 0) return;

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    // 전체를 한 번에 돌리면 시간이 너무 걸리므로 1000개 단위로 끊어서 진행하거나 루프 진행
    for (let i = 0; i < lectures.length; i++) {
        const lecture = lectures[i];

        // 이미 좌표가 정확한지 체크하는 로직은 생략하고 일단 전체 업데이트 (서울 지터링 때문)
        const coords = await geocodeAddress(lecture.address);

        if (coords) {
            const { error: updateError } = await supabase
                .from('lectures')
                .update({ lat: coords.lat, lng: coords.lng })
                .eq('id', lecture.id);

            if (updateError) {
                console.error(`Error updating lecture ${lecture.id}:`, updateError);
                failCount++;
            } else {
                successCount++;
            }
        } else {
            failCount++;
        }

        if ((i + 1) % 50 === 0) {
            console.log(`Progress: ${i + 1}/${lectures.length} (Success: ${successCount}, Fail: ${failCount}, Skipped: ${skippedCount})`);
        }

        // 카카오 API 및 Supabase 부하 분산
        await new Promise(resolve => setTimeout(resolve, 20));
    }

    console.log(`Geocoding completed. Total: ${lectures.length}, Success: ${successCount}, Fail: ${failCount}, Skipped: ${skippedCount}`);
}

main();
