"use client";

// components/Navbar.tsx
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Track whether a user is logged in
  // null = still checking, undefined = not logged in, object = logged in
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // useEffect runs after the component loads in the browser
    // Here we check if there's a logged-in user when the navbar first appears
    // Think of it like an initialisation block in Java
    const supabase = createClient();

    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setChecking(false);
    }

    getUser();

    // Also listen for auth changes — if user logs in or out anywhere,
    // the navbar updates automatically
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Cleanup the listener when the navbar unmounts
    // Like removing an event listener in Java
    return () => subscription.unsubscribe();
  }, []); // empty [] means "run this once when component first loads"

  async function handleLogOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // Returns highlighted style if the current path matches the link's href
  function navLinkClass(href: string) {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    return isActive
      ? "bg-red-600/80 text-white font-semibold px-5 py-2 rounded-lg flex items-center"
      : "hover:text-red-600 transition-colors px-5 flex items-center";
  }

  return (
    <nav className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-bold text-red-600 tracking-tight"
        >
          MyVolley 🏐
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-stretch gap-0 h-full text-sm font-medium text-gray-600">
          <Link href="/clubs" className={navLinkClass("/clubs")}>
            Clubs
          </Link>
          <Link href="/events" className={navLinkClass("/events")}>
            Events
          </Link>
          <Link href="/live" className={navLinkClass("/live")}>
            Watch Live
          </Link>
          <Link href="/players" className={navLinkClass("/players")}>
            Players
          </Link>
        </div>

        {/* Desktop auth buttons — changes based on login state */}
        <div className="hidden md:flex items-center gap-3">
          {checking ? (
            // Still checking auth state — show nothing to avoid flicker
            <div className="w-20 h-8 bg-gray-100 rounded-full animate-pulse"></div>
          ) : user ? (
            // User IS logged in — show Dashboard link and Log Out button
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogOut}
                className="text-sm font-medium bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                Log Out
              </button>
            </>
          ) : (
            // User is NOT logged in — show Log In and Sign Up
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-600 focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <span className="text-2xl">✕</span>
          ) : (
            <span className="text-2xl">☰</span>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4 text-sm font-medium text-gray-600">
          <Link
            href="/clubs"
            onClick={() => setMenuOpen(false)}
            className="hover:text-red-600"
          >
            Clubs
          </Link>
          <Link
            href="/events"
            onClick={() => setMenuOpen(false)}
            className="hover:text-red-600"
          >
            Events
          </Link>
          <Link
            href="/players"
            onClick={() => setMenuOpen(false)}
            className="hover:text-red-600"
          >
            Players
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="hover:text-red-600"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogOut}
                className="text-left text-red-600 font-semibold hover:text-red-700"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="hover:text-red-600"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className="hover:text-red-600 text-red-600 font-semibold"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
