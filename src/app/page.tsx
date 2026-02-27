import Map from '@/components/Map';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center pt-8 pb-4 px-4 font-inter">
      <section className="w-full flex-1 flex flex-col relative pt-4">
        <Map />
      </section>

      <footer className="w-full mt-2 mb-2 flex flex-col items-center gap-3 text-center text-xs text-slate-400">
        <p>&copy; 2026 JEREMYKIM. ALL RIGHTS RESERVED.</p>
        <Link href="/about" className="font-medium text-slate-500 hover:text-[#1E3A8A] transition-colors underline underline-offset-4 decoration-slate-300 hover:decoration-[#1E3A8A]">
          About us
        </Link>
      </footer>
    </main>
  );
}
