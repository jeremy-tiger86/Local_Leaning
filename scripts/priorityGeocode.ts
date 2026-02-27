import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;

async function geocode(address: string) {
    try {
        const response = await fetch(
            `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
            {
                headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` }
            }
        );
        const result: any = await response.json();
        if (result.documents && result.documents.length > 0) {
            return {
                lat: parseFloat(result.documents[0].y),
                lng: parseFloat(result.documents[0].x)
            };
        }
    } catch (e) {
        console.error(`Geocoding error for ${address}:`, e);
    }
    return null;
}

async function runPriorityGeocode() {
    console.log('Starting PRIORITY geocoding for Damyang/Jeollanam-do...');

    // Fetch lectures in Jeollanam-do or Damyang
    const { data: lectures, error } = await supabase
        .from('lectures')
        .select('id, title, address')
        .or('address.ilike.%담양%,address.ilike.%전라남도%');

    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    console.log(`Found ${lectures.length} priority lectures.`);

    let success = 0;
    let fail = 0;

    for (const lecture of lectures) {
        const coords = await geocode(lecture.address);
        if (coords) {
            const { error: updateError } = await supabase
                .from('lectures')
                .update({
                    lat: coords.lat,
                    lng: coords.lng,
                    updated_at: new Date().toISOString()
                })
                .eq('id', lecture.id);

            if (!updateError) {
                success++;
            } else {
                fail++;
            }
        } else {
            fail++;
        }

        if ((success + fail) % 50 === 0) {
            console.log(`Progress: ${success + fail} / ${lectures.length} (Success: ${success}, Fail: ${fail})`);
        }
    }

    console.log(`Finished! Total: ${lectures.length}, Success: ${success}, Fail: ${fail}`);
}

runPriorityGeocode();
