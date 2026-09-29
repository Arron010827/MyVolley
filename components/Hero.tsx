// components/Hero.tsx

import Link from "next/link";

// The Hero is the big banner section at the top of the homepage.
// It's the first thing visitors see — it should clearly explain
// what the site is and invite them to take action.
export default function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-white overflow-hidden">
      {/* Decorative background circles — purely visual, adds depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-28 flex flex-col items-center text-center gap-6">
        {/* Main headline */}
        <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
          {"Malaysia's Volleyball Hub"}
        </h1>

        {/* Subheading / tagline */}
        <p className="text-lg md:text-xl text-red-100 max-w-xl">
          Find clubs, discover events, and connect with players across Malaysia
          — all in one place.
        </p>

        {/* Call to action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Link
            href="/signup"
            className="bg-white text-red-600 font-semibold px-8 py-3 rounded-full hover:bg-red-50 hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            Get Started
          </Link>
          <Link
            href="/events"
            className="border-2 border-white text-white font-semibold px-8 py-3 rounded-full hover:bg-white hover:text-red-600 hover:scale-105 transition-all duration-200"
          >
            Browse Events
          </Link>
        </div>

        {/* Quick stats — placeholder numbers for now */}
        <div className="flex gap-12 mt-12 text-center">
          <div>
            <p className="text-3xl font-bold">50+</p>
            <p className="text-red-200 text-sm mt-1">Registered Clubs</p>
          </div>
          <div>
            <p className="text-3xl font-bold">200+</p>
            <p className="text-red-200 text-sm mt-1">Active Players</p>
          </div>
          <div>
            <p className="text-3xl font-bold">30+</p>
            <p className="text-red-200 text-sm mt-1">Events This Year</p>
          </div>
        </div>
      </div>
    </section>
  );
}
