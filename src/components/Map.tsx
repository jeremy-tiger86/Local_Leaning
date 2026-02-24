'use client';

import { useEffect, useState } from 'react';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import dynamic from 'next/dynamic';
import { Lecture } from '@/types/lecture';
import { MapPin, Calendar, User, ExternalLink, CheckCircle, Heart } from 'lucide-react';

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-64 md:h-[500px] bg-slate-200 animate-pulse rounded-2xl flex items-center justify-center">
            <p className="text-slate-500 font-medium">지도 데이터를 불러오고 있습니다...</p>
        </div>
    )
});

export default function Map() {
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFreeOnly, setShowFreeOnly] = useState(true); // 무료 강좌만 보기 필터

    // Zustand Favorites State
    const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    // Categories State
    const CATEGORIES = ['전체', 'IT/프로그래밍', '어학', '인문/교양', '자격증'];
    const [selectedCategory, setSelectedCategory] = useState('전체');

    const calculateDDay = (applyEnd?: string) => {
        if (!applyEnd) return null;
        const end = new Date(applyEnd);
        const now = new Date();
        end.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return '마감';
        if (diffDays === 0) return 'D-Day';
        return `D-${diffDays}`;
    };

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
                    // Fallback
                    setLocation({ lat: 37.5665, lng: 126.9780 });
                    setErrorMsg('내 위치를 찾을 수 없어 기본 위치(서울)로 설정되었습니다.');
                    console.error(error);
                }
            );
        } else {
            setLocation({ lat: 37.5665, lng: 126.9780 });
            setErrorMsg('브라우저가 위치 정보를 지원하지 않아 기본 위치(서울)로 설정되었습니다.');
        }
    }, []);

    // K-MOOC 데이터 등은 기본적으로 무료(0원) 강좌로 세팅되어 내려오지만,
    // 유저 요구사항 충족을 위해 필터 로직 구현
    let filteredLectures = showFreeOnly ? lectures.filter(l => l.isFree) : lectures;
    if (showFavoritesOnly) {
        filteredLectures = filteredLectures.filter(l => isFavorite(String(l.id)));
    }
    if (selectedCategory !== '전체') {
        filteredLectures = filteredLectures.filter(l => {
            if (selectedCategory === 'IT/프로그래밍') return l.title.includes('프로그래밍') || l.title.includes('IT') || l.title.includes('데이터') || l.title.includes('AI') || l.title.includes('인공지능') || l.title.includes('소프트웨어');
            if (selectedCategory === '어학') return l.title.includes('영어') || l.title.includes('중국어') || l.title.includes('일본어') || l.title.includes('어학');
            if (selectedCategory === '인문/교양') return l.title.includes('인문') || l.title.includes('교양') || l.title.includes('철학') || l.title.includes('역사') || l.title.includes('심리');
            if (selectedCategory === '자격증') return l.title.includes('자격증') || l.title.includes('기사') || l.title.includes('기능사');
            return true;
        });
    }

    return (
        <div className="w-full h-full min-h-[500px] bg-slate-50 flex flex-col items-center justify-start p-4 md:p-6 rounded-2xl shadow-sm relative">
            <div className="w-full max-w-5xl flex flex-col md:flex-row gap-6 h-full">

                {/* 지도 영역 (좌측) */}
                <div className="w-full md:w-1/2 flex flex-col gap-3">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <MapPin className="text-blue-600" size={24} />
                        주소 주변 강좌 지도
                    </h2>

                    {location ? (
                        <div className="w-full h-64 md:h-[500px] overflow-hidden rounded-2xl border border-slate-200 shadow-sm relative z-0">
                            <LeafletMap location={location} lectures={filteredLectures} />
                        </div>
                    ) : (
                        <div className="w-full h-64 md:h-[500px] bg-slate-200 animate-pulse rounded-2xl flex items-center justify-center">
                            <p className="text-slate-500 font-medium">지도 데이터를 불러오고 있습니다...</p>
                        </div>
                    )}

                    {errorMsg && (
                        <p className="text-sm text-amber-600 font-medium bg-amber-50 p-3 rounded-lg border border-amber-200">{errorMsg}</p>
                    )}
                </div>

                {/* 리스트 영역 (우측) */}
                <div className="w-full md:w-1/2 flex flex-col h-[500px] md:h-auto">
                    <div className="flex justify-between items-center mb-3 flex-wrap gap-3">
                        <h3 className="font-bold text-xl text-slate-800 w-full xl:w-auto">방금 찾은 강좌 리스트</h3>

                        {/* 필터 체크박스 */}
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-rose-500 rounded border-gray-300 focus:ring-rose-500"
                                    checked={showFavoritesOnly}
                                    onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                                />
                                <span className="text-sm font-medium text-slate-700 select-none flex items-center gap-1"><Heart size={14} className={showFavoritesOnly ? "text-rose-500 fill-rose-500" : "text-slate-400"} /> 찜한 강좌만</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    checked={showFreeOnly}
                                    onChange={(e) => setShowFreeOnly(e.target.checked)}
                                />
                                <span className="text-sm font-medium text-slate-700 select-none">무료 강좌만</span>
                            </label>
                        </div>
                    </div>

                    {/* 카테고리 칩 */}
                    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar shrink-0">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${selectedCategory === cat ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="w-full flex-1 max-w-full bg-transparent overflow-y-auto pr-2 custom-scrollbar">
                            <ul className="space-y-4 pb-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <li key={i} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm animate-pulse">
                                        <div className="flex justify-between items-start gap-4 mb-3">
                                            <div className="flex flex-col gap-2 w-full">
                                                <div className="h-5 bg-slate-100 rounded-md w-16"></div>
                                                <div className="h-6 bg-slate-100 rounded-md w-3/4"></div>
                                            </div>
                                            <div className="w-8 h-8 bg-slate-100 rounded-full shrink-0"></div>
                                        </div>
                                        <div className="mb-4">
                                            <div className="h-6 bg-slate-100 rounded-full w-12"></div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                                            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                                            <div className="h-4 bg-slate-100 rounded w-full sm:col-span-2"></div>
                                            <div className="h-4 bg-slate-100 rounded w-3/4 sm:col-span-2"></div>
                                        </div>
                                        <div className="h-10 bg-slate-100 rounded-xl w-full mt-2"></div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="w-full flex-1 max-w-full bg-transparent overflow-y-auto pr-2 custom-scrollbar">
                            <ul className="space-y-4 pb-4">
                                {filteredLectures.map((lecture) => {
                                    const isFav = isFavorite(String(lecture.id));
                                    const dDay = calculateDDay(lecture.applyEnd);
                                    return (
                                        <li key={lecture.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all group relative">
                                            <button
                                                onClick={() => isFav ? removeFavorite(String(lecture.id)) : addFavorite(lecture)}
                                                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                                                title={isFav ? "찜 해제" : "찜하기"}
                                            >
                                                <Heart size={20} className={isFav ? "text-rose-500 fill-rose-500" : "text-slate-300"} />
                                            </button>
                                            <div className="flex justify-between items-start gap-4 mb-3 pr-8">
                                                <div className="flex flex-col gap-1.5">
                                                    {dDay && (
                                                        <span className={`w-fit text-xs font-bold px-2.5 py-1 rounded-md ${dDay === '마감' ? 'bg-slate-100 text-slate-500' : (dDay === 'D-Day' || (dDay.startsWith('D-') && parseInt(dDay.replace('D-', '')) <= 3) ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700')}`}>
                                                            {dDay === '마감' ? '접수마감' : `접수마감 ${dDay}`}
                                                        </span>
                                                    )}
                                                    <p className="font-bold text-lg text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">{lecture.title}</p>
                                                </div>
                                            </div>
                                            <div className="mb-3">
                                                <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${lecture.isFree ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    <CheckCircle size={14} /> {lecture.price || (lecture.isFree ? '무료' : '유료')}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <User size={16} className="text-slate-400 shrink-0" />
                                                    <span className="font-medium truncate">{lecture.instructor}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <User size={16} className="text-slate-400 shrink-0" /> {/* 대상 아이콘이지만 임시로 User 재사용 */}
                                                    <span className="truncate">{lecture.target}</span>
                                                </div>
                                                <div className="flex items-center gap-2 sm:col-span-2">
                                                    <Calendar size={16} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{lecture.period}</span>
                                                </div>
                                                <div className="flex items-center gap-2 sm:col-span-2">
                                                    <MapPin size={16} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{lecture.address}</span>
                                                </div>
                                            </div>

                                            {lecture.link && (
                                                <a href={lecture.link} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl transition-colors text-sm shadow-sm">
                                                    <ExternalLink size={16} />
                                                    수강 신청하러 가기
                                                </a>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                            {filteredLectures.length === 0 && (
                                <div className="w-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
                                    조건에 맞는 강좌가 없습니다.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollbar styling */}
            <style dangerouslySetInnerHTML={{
                __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}} />
        </div>
    );
}
