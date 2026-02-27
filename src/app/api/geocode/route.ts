import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
        return NextResponse.json({ success: false, message: 'Missing coordinates' }, { status: 400 });
    }

    const REST_API_KEY = process.env.KAKAO_REST_API_KEY || process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;

    if (!REST_API_KEY) {
        console.error('Missing Kakao API Key');
        return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    try {
        const url = `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`;
        const response = await fetch(url, {
            headers: {
                Authorization: `KakaoAK ${REST_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch from Kakao API');
        }

        const data = await response.json();
        const documents = data.documents;

        if (documents && documents.length > 0) {
            // "H" is for 행정동 (administrative dong), "B" is for 법정동 (legal dong)
            // Either works for getting Sido and Sigungu, let's use the first one available
            const region = documents[0];
            return NextResponse.json({
                success: true,
                sido: region.region_1depth_name,
                sigungu: region.region_2depth_name,
                dong: region.region_3depth_name
            });
        }

        return NextResponse.json({ success: false, message: 'No region found' }, { status: 404 });
    } catch (error) {
        console.error('Reverse Geoding Error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
