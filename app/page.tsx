import LandingHero from '@/components/LandingHero';

export default function Home() {
  return (
    <main className="min-h-screen">
      <LandingHero />
      <footer className="fixed bottom-0 left-0 right-0 py-4 text-center">
        <div className="flex items-center justify-center gap-4 text-xs text-gray-300">
          <a href="/privacy" className="hover:text-black transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="/terms" className="hover:text-black transition-colors">Terms of Service</a>
        </div>
      </footer>
    </main>
  );
}
