'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Lecture } from '@/types/lecture';
import { MapPin, Calendar, User, ExternalLink, CheckCircle, Map as MapIcon, List as ListIcon, ChevronDown, ChevronUp, X } from 'lucide-react';
import { calculateDistance } from '@/utils/distance';
import { REGIONS } from '@/constants/regions';

const KakaoMap = dynamic(() => import('@/components/KakaoMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[60vh] bg-slate-200/50 animate-pulse rounded-3xl flex items-center justify-center backdrop-blur-md">
            <p className="text-[#1E40AF] font-medium tracking-wide">지도 데이터를 불러오는 중...</p>
        </div>
    )
});

export default function Map() {
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [loading, setLoading] = useState(true);
    const [courseType, setCourseType] = useState<'offline' | 'online'>('offline');
    const CATEGORIES = ['전체', 'IT/디지털', '취미/문화', '재테크/자기계발', '인문/교양', '스포츠/건강'];
    const [selectedCategory, setSelectedCategory] = useState('전체');
    const [categoryExpanded, setCategoryExpanded] = useState(false);

    // Region Selection States
    const [regionMenuOpen, setRegionMenuOpen] = useState(false);
    const [selectedSido, setSelectedSido] = useState('서울특별시');
    const [selectedSigungu, setSelectedSigungu] = useState('중구');
    const [modalActiveSido, setModalActiveSido] = useState('서울특별시');

    const sidos = useMemo(() => Object.keys(REGIONS).sort(), []);
    const sigungus = useMemo(() => REGIONS[modalActiveSido]?.sort() || [], [modalActiveSido]);

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

    const fetchLectures = async (type: 'offline' | 'online', sido: string, sigungu: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ type });
            if (type === 'offline' && sido) params.set('sido', sido);
            if (type === 'offline' && sigungu && sigungu !== '전체') params.set('sigungu', sigungu);
            const res = await fetch(`/api/lectures?${params.toString()}`);
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

    // 초기 위치 파악 (최초 1회)
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setLocation({ lat, lng });

                    try {
                        const geoRes = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
                        const geoData = await geoRes.json();
                        if (geoData.success) {
                            const matchedSido = sidos.find(s => s.includes(geoData.sido) || geoData.sido.includes(s)) || geoData.sido;
                            setSelectedSido(matchedSido);
                            setSelectedSigungu(geoData.sigungu);
                            setModalActiveSido(matchedSido);
                        }
                    } catch (e) {
                        console.error('Geocoding failed', e);
                    }
                },
                (error) => {
                    setLocation({ lat: 37.5665, lng: 126.9780 });
                    setSelectedSido('서울특별시');
                    setSelectedSigungu('중구');
                    setModalActiveSido('서울특별시');
                    setErrorMsg('위치를 찾을 수 없어 기본 위치(서울)로 설정되었습니다.');
                    fetchLectures('offline', '서울특별시', '중구');
                    console.error(error);
                }
            );
        } else {
            setLocation({ lat: 37.5665, lng: 126.9780 });
            setSelectedSido('서울특별시');
            setSelectedSigungu('중구');
            setModalActiveSido('서울특별시');
            setErrorMsg('브라우저가 위치 정보를 지원하지 않습니다.');
            fetchLectures('offline', '서울특별시', '중구');
        }
    }, []);

    // courseType / 지역 변경 시 자동 재호출
    useEffect(() => {
        fetchLectures(courseType, selectedSido, selectedSigungu);
        setSelectedCategory('전체'); // 지역·타입 변경 시 카테고리 초기화
    }, [courseType, selectedSido, selectedSigungu]);

    const processedLectures = useMemo(() => {
        // 서버에서 이미 type/sido/sigungu 필터링 완료
        // 클라이언트: 거리 계산 + 카테고리 필터 + 마감 필터만 수행
        let filtered = lectures.map(lec => {
            let distance = Infinity;
            if (location && lec.lat != null && lec.lng != null) {
                distance = calculateDistance(location.lat, location.lng, lec.lat, lec.lng);
            }
            const isOnline = courseType === 'online';
            return { ...lec, distance, isOnline };
        });

        // ★ DB 중복 제거: title + address + coords 기준 dedup
        // 같은 주소라도 좌표가 다를 수 있고, 좌표 그룹화 기능을 위해 좌표 정보를 키에 포함합니다.
        const seen = new Set<string>();
        filtered = filtered.filter(l => {
            const key = `${l.title}||${l.address}||${l.lat}||${l.lng}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        if (selectedCategory !== '전체') {
            filtered = filtered.filter(l => l.category === selectedCategory);
        }

        // Filter out courses that have passed the application deadline (마감)
        filtered = filtered.filter(l => {
            const dDay = calculateDDay(l.applyEnd);
            return dDay !== '마감';
        });

        // Sort: Alphabetical order based on title (가나다 순)
        filtered.sort((a, b) => {
            return (a.title || '').localeCompare(b.title || '', 'ko');
        });

        return filtered;
    }, [lectures, courseType, selectedCategory, location, selectedSido, selectedSigungu]);

    return (
        <div className="w-full flex flex-col items-center relative font-inter pb-12">

            {errorMsg && (
                <div className="w-full mb-4 p-3 rounded-2xl bg-[#CA8A04]/10 border border-[#CA8A04]/20 text-[#CA8A04] text-sm text-center backdrop-blur-md transition-all">
                    {errorMsg}
                </div>
            )}

            {/* Title / Region Selector */}
            <div className="w-full flex flex-col items-start px-2 pt-1 pb-12 relative z-20">

                {/* Row 1: 토글버튼 - 화면 중앙 정렬 */}
                <div className="w-full flex justify-center mb-3">
                    <div className="flex bg-slate-100 rounded-full p-1 border border-slate-200 shadow-inner">
                        <button
                            onClick={() => {
                                setCourseType('offline');
                                setViewMode('list');
                            }}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${courseType === 'offline' ? 'bg-white text-[#1E3A8A] shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            오프라인
                        </button>
                        <button
                            onClick={() => {
                                setCourseType('online');
                                setViewMode('list');
                            }}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${courseType === 'online' ? 'bg-white text-[#1E3A8A] shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            온라인
                        </button>
                    </div>
                </div>

                {/* 구분선 */}
                <div className="w-full border-t border-slate-100 mb-3" />

                {/* Row 2: 로고 + 서브문구 (좌) + 지역선택 (우, 오프라인만) */}
                <div className="w-full flex items-end justify-between gap-2">
                    <div className="flex items-end gap-3">
                        <img
                            src="/logo.png"
                            alt="Moi (모이)"
                            className="h-10 w-auto object-contain shrink-0"
                        />
                        <p className="text-slate-600 text-[13px] sm:text-sm tracking-tight mb-0.5">
                            나를 위한 배움이 모이는 곳
                        </p>
                    </div>

                    {courseType === 'offline' && (
                        <button
                            onClick={() => {
                                setModalActiveSido(selectedSido);
                                setRegionMenuOpen(true);
                            }}
                            className="flex items-center gap-1.5 text-[11px] sm:text-[13px] font-bold tracking-tight text-[#1E3A8A] hover:bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-white/50 backdrop-blur-sm transition-all shadow-sm shrink-0"
                        >
                            <MapPin size={14} className="text-[#1E3A8A]" strokeWidth={2.5} />
                            <span>{selectedSido}</span>
                            <span className="flex items-center gap-0.5 text-[#475569]">
                                {selectedSigungu}
                                <ChevronDown size={14} className="text-[#475569]" strokeWidth={2.5} />
                            </span>
                        </button>
                    )}
                </div>
            </div>



            {/* Region Selection Modal */}
            {regionMenuOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm shadow-2xl transition-all duration-300">
                    {/* Modal Content */}
                    <div className="w-full max-w-[480px] bg-white sm:rounded-3xl rounded-t-3xl h-[65vh] sm:h-[60vh] flex flex-col overflow-hidden animate-slide-up sm:animate-fade-in shadow-2xl border border-slate-200">
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white">
                            <h2 className="text-lg font-bold text-[#1E3A8A]">지역 선택</h2>
                            <button onClick={() => setRegionMenuOpen(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body - Two Columns */}
                        <div className="flex flex-1 overflow-hidden bg-white">
                            {/* Left Column - Sido */}
                            <div className="w-1/2 md:w-5/12 border-r border-slate-100 overflow-y-auto hide-scrollbar-smooth bg-slate-50/50">
                                {sidos.map(sido => (
                                    <button
                                        key={sido}
                                        onClick={() => setModalActiveSido(sido)}
                                        className={`w-full text-left px-5 py-3.5 text-sm transition-colors ${modalActiveSido === sido ? 'bg-white text-[#1E3A8A] font-bold border-l-4 border-[#1E3A8A]' : 'text-slate-600 hover:bg-slate-100 font-medium border-l-4 border-transparent'}`}
                                    >
                                        {sido}
                                    </button>
                                ))}
                            </div>

                            {/* Right Column - Sigungu */}
                            <div className="w-1/2 md:w-7/12 overflow-y-auto hide-scrollbar-smooth bg-white">
                                {sigungus.length > 0 ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                setSelectedSido(modalActiveSido);
                                                setSelectedSigungu('전체');
                                                setRegionMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-5 py-3.5 text-sm transition-colors hover:bg-slate-50 ${selectedSido === modalActiveSido && selectedSigungu === '전체' ? 'text-[#1E3A8A] font-bold' : 'text-slate-700 font-medium'}`}
                                        >
                                            전체
                                        </button>
                                        {sigungus.map(sigungu => (
                                            <button
                                                key={sigungu}
                                                onClick={() => {
                                                    setSelectedSido(modalActiveSido);
                                                    setSelectedSigungu(sigungu);
                                                    setRegionMenuOpen(false);
                                                }}
                                                className={`w-full text-left px-5 py-3.5 text-sm transition-colors hover:bg-slate-50 ${selectedSido === modalActiveSido && selectedSigungu === sigungu ? 'text-[#1E3A8A] font-bold' : 'text-slate-700 font-medium'}`}
                                            >
                                                {sigungu}
                                            </button>
                                        ))}
                                    </>
                                ) : (
                                    <div className="w-full px-5 py-4 text-sm text-slate-400 flex items-center justify-center">
                                        하위 지역이 없습니다
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Controls */}
            <div className="w-full flex flex-col gap-4 mb-6 z-10">
                <div className="flex flex-col w-full gap-2">
                    <div className="flex items-start relative w-full px-2">
                        <div className={`flex gap-1.5 flex-1 pb-2 hide-scrollbar-smooth select-none ${categoryExpanded ? 'flex-wrap' : 'overflow-x-auto pr-2'
                            }`}>
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-300 border backdrop-blur-md ${selectedCategory === cat ? 'bg-[#1E40AF] text-white border-[#1E40AF] shadow-md' : 'bg-white/70 border-white/40 text-slate-600 hover:bg-white/90 hover:shadow-sm'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        {/* 펼치기/접기 버튼 */}
                        <button
                            onClick={() => setCategoryExpanded(!categoryExpanded)}
                            className="shrink-0 ml-1 p-1.5 rounded-full bg-white/70 border border-white/40 text-slate-500 hover:bg-white/90 hover:text-slate-700 transition-all"
                            aria-label={categoryExpanded ? '접기' : '펼치기'}
                        >
                            {categoryExpanded ? <ChevronUp size={16} strokeWidth={2.5} /> : <ChevronDown size={16} strokeWidth={2.5} />}
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center flex-wrap gap-4 px-2">
                    <span className="text-[#1E40AF] font-medium text-sm">
                        {loading ? '강좌 검색 중...' : `총 ${processedLectures.length}개의 강좌가 있습니다`}
                    </span>
                </div>
            </div>

            {/* Content Area */}
            {viewMode === 'map' ? (
                /* Map View */
                <div className="w-full h-[65vh] rounded-[2rem] overflow-hidden shadow-xl border-4 border-white/50 relative z-0 animate-in fade-in zoom-in-95 duration-500">
                    <KakaoMap
                        lectures={processedLectures}
                        userLocation={location}
                    />
                </div>
            ) : (
                /* List View */
                <div className="w-full flex flex-col gap-5 animate-in slide-in-from-bottom-4 duration-500">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="w-full bg-white/60 backdrop-blur-xl border border-white/80 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-pulse">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-3/4"><div className="h-6 bg-slate-200 rounded-md w-full mb-2"></div><div className="h-4 bg-slate-200 rounded-md w-1/2"></div></div>
                                    <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                                </div>
                                <div className="space-y-3 mt-6">
                                    <div className="h-4 bg-slate-200 rounded-md w-full"></div>
                                    <div className="h-4 bg-slate-200 rounded-md w-2/3"></div>
                                </div>
                            </div>
                        ))
                    ) : processedLectures.length > 0 ? (
                        processedLectures.map((lecture) => {
                            const dDay = calculateDDay(lecture.applyEnd);
                            const distanceStr = !lecture.isOnline && lecture.distance !== Infinity && lecture.distance !== undefined
                                ? `${lecture.distance.toFixed(1)}km`
                                : '';

                            return (
                                <div key={lecture.id} className="group relative w-full bg-white/60 backdrop-blur-xl hover:bg-white/90 border border-white/80 p-6 rounded-3xl shadow-[0_8px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(30,58,138,0.08)] transition-all duration-300 transform hover:-translate-y-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-4 min-h-[36px]">
                                        {dDay && (
                                            <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${dDay === '마감' ? 'bg-slate-200/50 text-slate-500' : (dDay === 'D-Day' || (dDay.startsWith('D-') && parseInt(dDay.replace('D-', '')) <= 3) ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700')}`}>
                                                {dDay === '마감' ? '접수마감' : `접수마감 ${dDay}`}
                                            </span>
                                        )}
                                        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${lecture.isFree ? 'bg-blue-100 text-[#1E3A8A]' : 'bg-[#CA8A04]/10 text-[#CA8A04]'}`}>
                                            {lecture.price || (lecture.isFree ? '무료' : '유료')}
                                        </span>
                                        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${lecture.isOnline ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                                            {lecture.isOnline ? '온라인' : '오프라인'}
                                        </span>
                                        {distanceStr && (
                                            <span className="text-[11px] font-semibold text-[#1E40AF] bg-blue-50/80 backdrop-blur-md border border-blue-100 px-3 py-1.5 rounded-full flex items-center gap-1 ml-auto">
                                                <MapPin size={12} /> {distanceStr}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-xl font-bold text-slate-900 leading-snug mb-5 group-hover:text-[#1E3A8A] transition-colors line-clamp-2">
                                        {lecture.title}
                                    </h3>

                                    <div className="grid grid-cols-1 gap-y-3 gap-x-6 text-sm text-slate-600 bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50">
                                        <div className="flex items-start gap-2.5">
                                            <User size={16} className="text-[#3B82F6] shrink-0 mt-0.5" />
                                            <span className="font-medium text-slate-700">{lecture.instructor}</span>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <Calendar size={16} className="text-[#3B82F6] shrink-0 mt-0.5" />
                                            <span className="text-slate-700">{lecture.period}</span>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <MapPin size={16} className="text-[#CA8A04] shrink-0 mt-0.5" />
                                            <span className="line-clamp-1 text-slate-700">{lecture.address}</span>
                                        </div>
                                    </div>

                                    {lecture.link && (
                                        <div className="mt-6">
                                            <a href={lecture.link} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#1E3A8A] hover:bg-[#1E40AF] text-white font-medium rounded-2xl transition-all duration-300 shadow-lg shadow-[#1E3A8A]/20 hover:shadow-xl hover:shadow-[#1E3A8A]/30">
                                                <span>수강 신청하기</span>
                                                <ExternalLink size={16} />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="w-full py-16 text-center bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 text-slate-500 shadow-sm">
                            <p className="text-lg font-bold text-slate-700">신청 가능한 학습 강좌가 없습니다</p>
                            <p className="text-sm mt-2 text-slate-500">다른 지역이나 카테고리를 선택해 보세요.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Floating Action Button for Toggle (Only show if Offline) */}
            {courseType === 'offline' && (
                <div className="fixed bottom-8 z-50 flex justify-end w-full max-w-[480px] px-6 pointer-events-none" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                    <button
                        onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                        className="pointer-events-auto flex items-center justify-center w-14 h-14 bg-[#1E3A8A] text-white rounded-full shadow-[0_8px_30px_rgb(30,58,138,0.3)] hover:bg-[#1E40AF] hover:scale-105 active:scale-95 transition-all duration-300 border border-white/10 backdrop-blur-xl"
                        aria-label={viewMode === 'list' ? '지도 뷰' : '목록 뷰'}
                    >
                        {viewMode === 'list' ? (
                            <MapIcon size={24} />
                        ) : (
                            <ListIcon size={24} />
                        )}
                    </button>
                </div>
            )}

            {/* Scoped Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scrollbar-smooth::-webkit-scrollbar { display: none; }
                .hide-scrollbar-smooth { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
}

