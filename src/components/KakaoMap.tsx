'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Map, MapMarker, MarkerClusterer, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { ExternalLink, MapPin } from 'lucide-react';

interface Lecture {
    id: string;
    title: string;
    instructor: string;
    period: string;
    address: string;
    lat: number | null;
    lng: number | null;
    link?: string;
    isOnline?: boolean;
    distance?: number;
    applyEnd?: string;
    target?: string;
    isFree?: boolean;
    price?: string;
    category?: string;
}

interface KakaoMapProps {
    lectures: Lecture[];
    userLocation: { lat: number; lng: number } | null;
}

const KakaoMap = ({ lectures, userLocation }: KakaoMapProps) => {
    const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);

    // Filter out lectures with invalid coordinates
    const validLectures = useMemo(() => {
        return lectures.filter(l => l.lat !== 0 && l.lng !== 0 && l.lat != null && l.lng != null);
    }, [lectures]);

    // Group lectures by coordinates
    const lectureGroups = useMemo(() => {
        const groups: { [key: string]: { position: { lat: number; lng: number }; lectures: Lecture[] } } = {};

        validLectures.forEach(lecture => {
            const key = `${lecture.lat},${lecture.lng}`;
            if (!groups[key]) {
                groups[key] = {
                    position: { lat: lecture.lat as number, lng: lecture.lng as number },
                    lectures: []
                };
            }
            groups[key].lectures.push(lecture);
        });

        return Object.values(groups);
    }, [validLectures]);

    const [selectedGroup, setSelectedGroup] = useState<{ position: { lat: number; lng: number }; lectures: Lecture[] } | null>(null);

    // Initial center: user location or Seoul City Hall
    const center = useMemo(() => {
        if (userLocation) return userLocation;
        return { lat: 37.5665, lng: 126.9780 };
    }, [userLocation]);

    return (
        <div className="w-full h-full relative">
            <Map
                center={center}
                style={{ width: "100%", height: "100%" }}
                level={8}
            >
                {/* User Location Marker */}
                {userLocation && (
                    <MapMarker
                        position={userLocation}
                        image={{
                            src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
                            size: { width: 24, height: 35 },
                        }}
                    />
                )}

                {/* Lecture Markers with Clusterer */}
                <MarkerClusterer
                    averageCenter={true}
                >
                    {lectureGroups.map((group, idx) => (
                        <MapMarker
                            key={`${group.position.lat}-${group.position.lng}-${idx}`}
                            position={group.position}
                            onClick={() => setSelectedGroup(group)}
                        />
                    ))}
                </MarkerClusterer>

                {/* Custom Overlay for Details */}
                {selectedGroup && (
                    <CustomOverlayMap
                        position={selectedGroup.position}
                        yAnchor={selectedGroup.lectures.length > 1 ? 1.05 : 1.2}
                    >
                        <div className={`bg-white rounded-2xl shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 relative overflow-hidden ${selectedGroup.lectures.length > 1 ? 'w-72 max-h-80' : 'w-64'}`}>
                            {/* Header for multi-lecture */}
                            {selectedGroup.lectures.length > 1 && (
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-bold text-[#1E3A8A] flex items-center gap-1">
                                        <div className="w-2 h-2 bg-[#1E3A8A] rounded-full animate-pulse" />
                                        총 {selectedGroup.lectures.length}개의 강좌
                                    </span>
                                </div>
                            )}

                            <button
                                onClick={() => setSelectedGroup(null)}
                                className="absolute top-2 right-2 z-10 p-1 bg-white/80 backdrop-blur-sm rounded-full text-slate-400 hover:text-slate-600 transition-colors shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>

                            <div className={`overflow-y-auto custom-scrollbar ${selectedGroup.lectures.length > 1 ? 'max-h-[280px]' : ''}`}>
                                {selectedGroup.lectures.map((lecture, idx) => (
                                    <div key={lecture.id} className={`p-4 ${idx !== selectedGroup.lectures.length - 1 ? 'border-b border-slate-50' : ''} hover:bg-slate-50/50 transition-colors group`}>
                                        <div className="pr-4">
                                            <h3 className="font-bold text-slate-900 leading-snug mb-1 line-clamp-2 group-hover:text-[#1E3A8A] transition-colors">{lecture.title}</h3>
                                            <p className="text-[11px] text-blue-600 font-bold mb-2 flex items-center gap-1">
                                                <span className="w-1 h-3 bg-blue-600 rounded-full" />
                                                {lecture.instructor}
                                            </p>

                                            <div className="space-y-1.5 mb-3">
                                                <div className="flex items-start gap-1.5 text-[11px] text-slate-500 font-medium">
                                                    <MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" />
                                                    <span className="line-clamp-2">{lecture.address}</span>
                                                </div>
                                            </div>

                                            {lecture.link && (
                                                <a
                                                    href={lecture.link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center justify-center gap-1.5 w-full bg-[#1E3A8A] hover:bg-[#1E40AF] text-white font-bold py-2 rounded-xl transition-all text-[11px] shadow-lg shadow-blue-100 active:scale-95"
                                                >
                                                    <ExternalLink size={12} />
                                                    상세보기
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <style jsx>{`
                            .custom-scrollbar::-webkit-scrollbar {
                                width: 4px;
                            }
                            .custom-scrollbar::-webkit-scrollbar-track {
                                background: transparent;
                            }
                            .custom-scrollbar::-webkit-scrollbar-thumb {
                                background: #CBD5E1;
                                border-radius: 10px;
                            }
                            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                background: #94A3B8;
                            }
                        `}</style>
                    </CustomOverlayMap>
                )}
            </Map>
        </div>
    );
};

export default KakaoMap;
