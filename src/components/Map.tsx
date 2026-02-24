'use client';

import { useEffect, useState } from 'react';
import { Lecture } from '@/types/lecture';

export default function Map() {
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLectures = async () => {
        try {
            const res = await fetch('/api/lectures');
            const data = await res.json();
            if (data.success) {
                setLectures(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLectures();

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                (error) => {
                    setErrorMsg('위치 정보를 가져오는 데 실패했습니다.');
                    console.error(error);
                }
            );
        } else {
            setErrorMsg('브라우저가 위치 정보를 지원하지 않습니다.');
        }
    }, []);

    return (
        <div className="w-full h-full min-h-[500px] bg-slate-100 flex flex-col items-center justify-center p-4 rounded-xl shadow-inner relative">
            {/* Map Placeholder for now */}
            <h2 className="text-xl font-bold text-gray-700 mb-2">지도 영역 (SDK 연동 예정)</h2>

            {location ? (
                <p className="text-sm text-blue-600 mb-4">
                    내 위치: 위도 {location.lat.toFixed(4)}, 경도 {location.lng.toFixed(4)}
                </p>
            ) : (
                <p className="text-sm text-red-500 mb-4">{errorMsg || '위치 정보를 요청 중...'}</p>
            )}

            {loading ? (
                <p className="animate-pulse">강좌 정보를 불러오는 중...</p>
            ) : (
                <div className="w-full max-w-2xl bg-white p-4 rounded shadow-md h-64 overflow-y-auto">
                    <h3 className="font-semibold mb-2">주변 무료 강좌 리스트 ({lectures.length}건)</h3>
                    <ul className="space-y-3">
                        {lectures.map((lecture) => (
                            <li key={lecture.id} className="border-b pb-2">
                                <p className="font-medium text-lg text-slate-800">{lecture.title}</p>
                                <div className="text-sm text-slate-600 mt-1 flex justify-between">
                                    <span>강사: {lecture.instructor}</span>
                                    <span>{lecture.target}</span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    기간: {lecture.period} | 위치: {lecture.address}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
