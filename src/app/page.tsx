import Map from '@/components/Map';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-6 md:p-12">
      <header className="w-full max-w-4xl mb-8 flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-900 tracking-tight">
          우리 동네 무료 강의 지도 🗺️
        </h1>
        <p className="text-slate-600 text-sm md:text-base">
          공공데이터포털 기반 현재 내 위치 주변의 학습 강좌를 찾아보세요.
        </p>
      </header>

      <section className="w-full max-w-4xl flex-1 flex flex-col">
        <Map />
      </section>

      <footer className="w-full max-w-4xl mt-8 text-center text-xs text-slate-400">
        Local_Leaning Project • Data provided by Public Data Portal (API)
      </footer>
    </main>
  );
}
