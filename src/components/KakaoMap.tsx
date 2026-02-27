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
                    minLevel={10}
                >
                    {validLectures.map((lecture) => (
                        <MapMarker
                            key={lecture.id}
                            position={{ lat: lecture.lat as number, lng: lecture.lng as number }}
                            onClick={() => setSelectedLecture(lecture)}
                        />
                    ))}
                </MarkerClusterer>

                {/* Custom Overlay for Details */}
                {selectedLecture && (
                    <CustomOverlayMap
                        position={{ lat: selectedLecture.lat as number, lng: selectedLecture.lng as number }}
                        yAnchor={1.2}
                    >
                        <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-4 w-64 animate-in fade-in zoom-in duration-200 relative">
                            <button
                                onClick={() => setSelectedLecture(null)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>

                            <div className="pr-4">
                                <h3 className="font-bold text-gray-900 leading-snug mb-1 line-clamp-2">{selectedLecture.title}</h3>
                                <p className="text-xs text-blue-600 font-medium mb-2">{selectedLecture.instructor}</p>

                                <div className="space-y-1.5 mb-3">
                                    <div className="flex items-start gap-1.5 text-xs text-gray-500">
                                        <MapPin size={12} className="mt-0.5 shrink-0" />
                                        <span className="line-clamp-2">{selectedLecture.address}</span>
                                    </div>
                                </div>

                                {selectedLecture.link && (
                                    <a
                                        href={selectedLecture.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-1.5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-all text-xs shadow-md shadow-blue-100 active:scale-95"
                                    >
                                        <ExternalLink size={12} />
                                        상세보기
                                    </a>
                                )}
                            </div>
                        </div>
                    </CustomOverlayMap>
                )}
            </Map>
        </div>
    );
};

export default KakaoMap;
