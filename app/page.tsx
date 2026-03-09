import LandingHero from '@/components/LandingHero';

export default function Home() {
  return (
    <main>
      <LandingHero />
      <div className="py-6 text-center bg-white">
        <a href="/privacy" className="text-xs text-gray-500 underline mx-3">Privacy Policy</a>
        <a href="/terms" className="text-xs text-gray-500 underline mx-3">Terms of Service</a>
      </div>
    </main>
  );
}
