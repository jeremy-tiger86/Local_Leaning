'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Lecture } from '@/types/lecture';
import { ExternalLink } from 'lucide-react';

// 커스텀 마커 아이콘 사용을 위해 불필요한 기본 아이콘 변수는 할당하지 않음

// 무료 마커 (파란색) - 기본 마커 사용 또는 컬러 조정
const freeIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// 유료 마커 (주황색)
const paidIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// 내 위치 마커 (빨간색)
const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface LeafletMapProps {
    lectures: Lecture[];
    location: { lat: number; lng: number } | null;
}

// 맵 중심 자동 이동을 위한 훅
function ChangeView({ center }: { center: { lat: number, lng: number } }) {
    const map = useMap();
    useEffect(() => {
        map.setView([center.lat, center.lng]);
    }, [center, map]);
    return null;
}

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

export default function LeafletMap({ lectures, location }: LeafletMapProps) {
    const center = location || { lat: 37.5665, lng: 126.9780 };

    return (
        <MapContainer center={[center.lat, center.lng]} zoom={13} style={{ height: '100%', width: '100%' }} className="rounded-2xl z-0">
            <ChangeView center={center} />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {location && (
                <Marker position={[location.lat, location.lng]} icon={userIcon}>
                    <Popup>
                        <strong className="text-red-600">내 위치</strong>
                    </Popup>
                </Marker>
            )}

            <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={50} // 겹치는 반경(픽셀) 설정
            >
                {lectures.filter(l => l.lat && l.lng).map((lecture) => {
                    const dDay = calculateDDay(lecture.applyEnd);
                    return (
                        <Marker
                            key={lecture.id}
                            position={[lecture.lat as number, lecture.lng as number]}
                            icon={lecture.isFree ? freeIcon : paidIcon}
                        >
                            <Popup className="min-w-[200px]">
                                <div className="flex flex-col gap-2">
                                    <div className="border-b pb-1">
                                        {dDay && (
                                            <span className={`inline-block mb-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${dDay === '마감' ? 'bg-slate-100 text-slate-500' : (dDay === 'D-Day' || (dDay.startsWith('D-') && parseInt(dDay.replace('D-', '')) <= 3) ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700')}`}>
                                                {dDay === '마감' ? '접수마감' : dDay}
                                            </span>
                                        )}
                                        <h3 className="font-bold text-gray-900 leading-tight m-0">{lecture.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-700 m-0"><strong>기관명:</strong> {lecture.target}</p>
                                    <p className="text-sm text-gray-700 m-0"><strong>수강료:</strong> <span className={lecture.isFree ? "text-blue-600 font-bold" : "text-orange-500 font-bold"}>{lecture.price || (lecture.isFree ? "무료" : "유료")}</span></p>

                                    {lecture.link && (
                                        <a href={lecture.link} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-1 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 rounded-lg transition-colors text-sm">
                                            <ExternalLink size={14} />
                                            상세보기
                                        </a>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}
            </MarkerClusterGroup>
        </MapContainer>
    );
}
