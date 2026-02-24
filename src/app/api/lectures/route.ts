import { NextResponse } from 'next/server';
import { Lecture } from '@/types/lecture';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    // Optional: Add filtering parameters based on user's bbox or queries later

    const API_KEY = process.env.NEXT_PUBLIC_DATA_PORTAL_KEY;

    // Example base URL. Replace with real Endpoint & ServiceKey
    // To avoid breaking without a real key, we can provide a fallback mock logic here.
    const url = `http://api.data.go.kr/openapi/tn_pubr_public_lftm_lrn_lctre_api?serviceKey=${API_KEY}&pageNo=1&numOfRows=100&type=json`;

    try {
        if (!API_KEY) {
            // IF No API key, return a mock fallback immediately for testing the UI
            const mockData: Lecture[] = [
                {
                    id: "MOCK1",
                    title: "스마트폰 기본 활용 교육 (무료)",
                    instructor: "김철수",
                    period: "2026-03-01 ~ 2026-03-30",
                    target: "지역 주민 누구나",
                    link: "http://example.com/apply",
                    lat: 37.5665,
                    lng: 126.9780,
                    address: "서울특별시 중구 세종대로 110"
                }
            ];
            return NextResponse.json({ success: true, data: mockData, message: "Using mock data (No API key found)" });
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Public API fetch failed with status: ${response.status}`);
        }

        const data = await response.json();

        // 1차 필터링 & 매핑: 비용이 '0' 또는 '무료'인 항목 필터링
        const items = data.response?.body?.items || [];
        const freeLectures: Lecture[] = items
            .filter((item: any) => item.edcExpn === '0' || item.edcExpn === '무료')
            .map((item: any) => ({
                id: item.lctreCo,
                title: item.lctreNm,
                instructor: item.instrctorNm,
                period: `${item.edcBgnde} ~ ${item.edcEndde}`,
                target: item.edcTrget,
                link: item.rceptSiteUrl,
                lat: item.latitude ? parseFloat(item.latitude) : null,
                lng: item.longitude ? parseFloat(item.longitude) : null,
                address: item.edcPlc // 지오코딩 폴백용 텍스트
            }));

        return NextResponse.json({ success: true, data: freeLectures });
    } catch (error: any) {
        console.error("Fetch Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
