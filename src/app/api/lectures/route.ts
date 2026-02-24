import { NextResponse } from 'next/server';
import { Lecture } from '@/types/lecture';

export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
    // URL 쿼리(예: ?keyword=...)를 파싱하여 활용할 수 있습니다.
    // const { searchParams } = new URL(request.url);

    const API_KEY = process.env.DATA_PORTAL_KEY || process.env.NEXT_PUBLIC_DATA_PORTAL_KEY;

    // K-MOOC 연동 엔드포인트 세팅 (courseList 오퍼레이션 사용)
    const baseUrl = 'https://apis.data.go.kr/B552881/kmooc_v2_0/courseList';
    const url = `${baseUrl}?serviceKey=${API_KEY}&MobileOS=ETC&MobileApp=LocalLeaning&pageNo=1&numOfRows=20`;

    // 위도/경도가 없으므로 기본 서울시청 앞 좌표를 주어 클러스터링을 테스트할 수 있도록 매핑합니다. (좌표 보정 요구사항)
    const mockData: Lecture[] = [
        {
            id: "KMOOC_MOCK1",
            title: "4차 산업혁명과 인공지능 (K-MOOC 모의데이터)",
            instructor: "김교수",
            period: "2026-03-01 ~ 2026-06-30",
            applyEnd: "2026-03-01",
            target: "전국민 (온라인)",
            link: "http://www.kmooc.kr/",
            lat: 37.5665,
            lng: 126.9780,
            address: "온라인 강좌",
            isFree: true,
            price: "무료"
        },
        {
            id: "KMOOC_MOCK2",
            title: "기초 프로그래밍 (K-MOOC 모의데이터)",
            instructor: "이수석",
            period: "상시",
            applyEnd: "2026-02-28", // 접수 마감 예시
            target: "초보자 (온라인)",
            link: "http://www.kmooc.kr/",
            lat: 37.5675,
            lng: 126.9790,
            address: "온라인 강좌",
            isFree: false,
            price: "50,000원"
        },
        {
            id: "KMOOC_MOCK3",
            title: "프론트엔드 심화 (K-MOOC 모의데이터)",
            instructor: "박개발",
            period: "상시",
            applyEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3일 뒤 마감
            target: "초보자 (온라인)",
            link: "http://www.kmooc.kr/",
            lat: 37.5665,
            lng: 126.9780,
            address: "온라인 강좌",
            isFree: true,
            price: "무료"
        }
    ];

    try {
        let finalData: Lecture[] = mockData;
        let message: string | undefined = "Using mock data (No API key configured)";

        if (API_KEY && API_KEY !== '여기에_공공데이터포털_키를_넣어주세요') {
            const response = await fetch(url, { headers: { accept: 'application/json' } });

            if (!response.ok) {
                console.warn(`Public API fetch failed with status: ${response.status}. Using mock data instead.`);
                message = "Using mock data fallback (Fetch HTTP error)";
            } else {
                const textData = await response.text();

                // 데이터 포털 에러(API not found 등) 대응
                if (textData.includes('API not found') || textData.includes('Unexpected errors') || textData.includes('<OpenAPI_ServiceResponse>')) {
                    console.warn("Public API returned XML or Error structure. Using mock data instead.", textData.substring(0, 100));
                    message = "Using mock data fallback (API returned error payload)";
                } else {
                    const data = JSON.parse(textData);
                    const items = data.results || data.response?.body?.items || [];

                    // K-MOOC API 응답 아이템 타입 인터페이스
                    interface KmoocItem {
                        id?: string; lctreCo?: string;
                        name?: string; lctreNm?: string;
                        teachers?: string; instrctorNm?: string;
                        start?: string; end?: string;
                        enrollment_end?: string;
                        org_name?: string; edcTrget?: string;
                        latitude?: string; longitude?: string;
                    }

                    const freeLectures: Lecture[] = items.map((item: KmoocItem) => {
                        let parsedApplyEnd = undefined;
                        if (item.enrollment_end) {
                            parsedApplyEnd = item.enrollment_end.substring(0, 10);
                        } else if (item.start) {
                            parsedApplyEnd = item.start.substring(0, 10);
                        }

                        return {
                            id: item.id || item.lctreCo,
                            title: item.name || item.lctreNm || '제목 없음',
                            instructor: item.teachers || item.instrctorNm || '강사 미상',
                            period: (item.start && item.end) ? `${item.start.substring(0, 10)} ~ ${item.end.substring(0, 10)}` : '상시',
                            applyEnd: parsedApplyEnd,
                            target: item.org_name || item.edcTrget || '누구나 (온라인)',
                            link: `http://www.kmooc.kr/courses/${item.id}/about`,
                            lat: item.latitude ? parseFloat(item.latitude) : 37.5665 + (Math.random() - 0.5) * 0.05,
                            lng: item.longitude ? parseFloat(item.longitude) : 126.9780 + (Math.random() - 0.5) * 0.05,
                            address: item.org_name ? `${item.org_name} (온라인 강좌)` : '온라인 K-MOOC 강좌',
                            isFree: true,
                            price: "무료"
                        };
                    });

                    if (freeLectures.length > 0) {
                        finalData = freeLectures;
                        message = undefined; // Success!
                    } else {
                        message = "Fetched empty items, fallback to mock data";
                    }
                }
            }
        }

        // --- Supabase Upsert Logic ---
        console.log("Upserting lectures to Supabase...");
        const { error: upsertError } = await supabase
            .from('lectures')
            .upsert(
                finalData.map(lecture => ({
                    id: String(lecture.id),
                    title: lecture.title,
                    instructor: lecture.instructor,
                    period: lecture.period,
                    target: lecture.target,
                    link: lecture.link,
                    lat: lecture.lat,
                    lng: lecture.lng,
                    address: lecture.address,
                    is_free: lecture.isFree,
                    price: lecture.price || null
                })),
                { onConflict: 'id' } // Upsert based on the 'id' column
            );

        if (upsertError) {
            console.error("Supabase upsert failed:", upsertError);
        } else {
            console.log("Supabase upsert successful.");
        }
        // ------------------------------

        return NextResponse.json({ success: true, data: finalData, message });
    } catch (error: unknown) {
        console.error("Fetch Error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ success: true, data: mockData, message: `Using mock data fallback (Error: ${errorMessage})` });
    }
}
