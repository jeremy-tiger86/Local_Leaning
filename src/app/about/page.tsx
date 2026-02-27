import Link from 'next/link';
import { BookOpen, MapPin, Database, ChevronLeft, Search, GraduationCap } from 'lucide-react';

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-slate-50 flex justify-center font-inter text-slate-800">
            <div className="w-full max-w-[480px] bg-white min-h-screen shadow-2xl shadow-blue-900/5 flex flex-col relative overflow-hidden">
                {/* Header */}
                <header className="w-full px-5 py-6 flex items-center border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-[#1E3A8A] transition-colors rounded-full hover:bg-slate-50">
                        <ChevronLeft size={24} />
                    </Link>
                    <h1 className="text-lg font-bold text-slate-800 ml-2">About Us</h1>
                </header>

                {/* Content */}
                <div className="px-6- sm:px-8 py-10 flex-1 overflow-y-auto">

                    {/* Hero Section */}
                    <div className="mb-14 text-center px-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-[#1E3A8A] mb-6 shadow-sm border border-blue-100/50">
                            <BookOpen size={32} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-3xl font-extrabold text-[#1E3A8A] tracking-tight mb-4 leading-tight">
                            Moi (모이)
                        </h2>
                        <h3 className="text-lg font-medium text-slate-600 mb-6 tracking-wide">
                            나를 위한 배움이 모이는 곳
                        </h3>
                        <p className="text-slate-600 leading-Relaxed text-sm sm:text-base text-left bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <strong className="text-[#1E3A8A] font-bold">Moi(모이)</strong>는 프랑스어로 <strong className="text-slate-800">'나'</strong>를 뜻하는 단어와, 사람들이 한데 <strong className="text-slate-800">'모이다'</strong>라는 우리말의 의미를 결합한 위치 기반 공공 교육 큐레이션 플랫폼입니다.
                            <br /><br />
                            우리는 흩어져 있는 국가 및 지자체의 교육 인프라를 기술로 통합하여, 사용자 개인의 삶에 가장 가까운 성장의 기회를 연결하고자 합니다. Moi는 단순한 정보 제공을 넘어, 지식의 문턱을 낮추고 성장의 기회를 평등하게 연결하는 혁신적인 가교 역할을 수행합니다.
                        </p>
                    </div>

                    <div className="w-12 h-1 bg-blue-100 mx-auto mb-14 rounded-full"></div>

                    {/* Core Values */}
                    <div className="mb-14 px-4 sm:px-6">
                        <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-[#1E3A8A] rounded-full"></div>
                            Core Values
                        </h3>
                        <div className="space-y-8 text-sm sm:text-base">
                            <div className="flex gap-4 items-start">
                                <div className="mt-1 p-2 bg-blue-50 text-[#1E3A8A] rounded-xl shrink-0">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-1 text-base">Hyper-Local <span className="text-slate-500 font-medium text-sm ml-1">(초근거리 연결)</span></h4>
                                    <p className="text-slate-600 leading-relaxed">내 위치를 중심으로 가장 가까운 교육 시설과 주민센터, 도서관의 강좌를 실시간으로 탐색합니다.</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="mt-1 p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                                    <GraduationCap size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-1 text-base">Accessibility <span className="text-slate-500 font-medium text-sm ml-1">(배움의 평등)</span></h4>
                                    <p className="text-slate-600 leading-relaxed">수강료 부담 없는 '0원' 강의와 국가 지원 온라인 강좌(K-MOOC)를 우선적으로 배치하여 누구나 배움의 기회를 누릴 수 있도록 돕습니다.</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="mt-1 p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                                    <Search size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-1 text-base">Data Reliability <span className="text-slate-500 font-medium text-sm ml-1">(신뢰할 수 있는 데이터)</span></h4>
                                    <p className="text-slate-600 leading-relaxed">공공데이터포털의 검증된 API를 통해 정확하고 공신력 있는 교육 정보를 실시간으로 분석하여 제공합니다.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-12 h-1 bg-slate-100 mx-auto mb-14 rounded-full"></div>

                    {/* Data Architecture */}
                    <div className="mb-10 px-4 sm:px-6">
                        <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-[#1E3A8A] rounded-full"></div>
                            Data Architecture
                        </h3>

                        <p className="text-slate-600 leading-relaxed mb-6 text-sm sm:text-base">
                            Moi는 대한민국 공공데이터포털의 핵심 API를 정교하게 재가공하여 사용자 중심의 UX로 선보입니다.
                        </p>

                        <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100/80 shadow-sm relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 text-slate-100">
                                <Database size={100} strokeWidth={1} />
                            </div>
                            <ul className="space-y-4 relative z-10 text-sm sm:text-base">
                                <li className="flex gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A] mt-2 shrink-0"></div>
                                    <div className="text-slate-700">
                                        <span className="font-semibold block mb-0.5">전국평생학습강좌표준데이터</span>
                                        <span className="text-slate-500 text-sm">지자체별 오프라인 강좌 및 취미 클래스 정보</span>
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A] mt-2 shrink-0"></div>
                                    <div className="text-slate-700">
                                        <span className="font-semibold block mb-0.5">국가평생교육진흥원 K-MOOC</span>
                                        <span className="text-slate-500 text-sm">강좌 정보: 대학 수준의 고품질 온라인 강의 커리큘럼</span>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div className="text-xs text-center text-slate-400 bg-slate-100/50 p-4 rounded-xl border border-slate-100">
                            Moi의 모든 정보는 <strong className="font-medium text-slate-600">대한민국 공공데이터포털(data.go.kr)</strong>에서 제공하는 행정안전부 및 국가평생교육진흥원의 실시간 API 데이터를 바탕으로 운영됩니다.
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}
