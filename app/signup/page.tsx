"use client";

// app/signup/page.tsx
// This is the sign up page — users enter their email and password
// to create a new MyVolley account.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function SignUpPage() {
  // useRouter lets us redirect the user after sign up
  // Think of it like a redirect in Java web apps
  const router = useRouter();

  // Form field values — one state variable per input
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state — for showing loading spinner and error/success messages
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // This function runs when the user clicks "Sign Up"
  async function handleSignUp() {
    // Reset any previous error message
    setError("");

    // Basic validation — check passwords match before hitting Supabase
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return; // Stop here — don't proceed
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // Show loading state while we wait for Supabase
    setLoading(true);

    // Create the Supabase client and attempt sign up
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      // Something went wrong — show the error to the user
      setError(error.message);
    } else if (
      data.user &&
      data.user.identities &&
      data.user.identities.length === 0
    ) {
      // identities is empty when the email is already registered
      // This is Supabase's way of telling us without revealing it directly
      setError("This email is already registered. Please log in instead.");
    } else {
      // Success! Show confirmation message
      // Note: Supabase sends a confirmation email by default.
      // The user needs to confirm before they can log in.
      setSuccess(true);
    }
  }

  // If sign up was successful, show a confirmation screen
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Check your email!
          </h2>
          <p className="text-gray-500 mb-6">
            We sent a confirmation link to{" "}
            <span className="font-medium text-gray-900">{email}</span>. Click it
            to activate your account.
          </p>
          <Link
            href="/login"
            className="text-red-600 font-medium hover:underline"
          >
            Back to Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-red-600">
            MyVolley 🏐
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">
            Create your account
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {"Join Malaysia's volleyball community"}
          </p>
        </div>

        {/* Error message — only shows if there's an error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {/* Form fields */}
        <div className="flex flex-col gap-4">
          {/* Email input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
            />
          </div>

          {/* Password input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
            />
          </div>

          {/* Confirm password input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm password
            </label>
            <input
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
            />
          </div>

          {/* Sign up button */}
          <button
            onClick={handleSignUp}
            disabled={loading}
            className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-2"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </div>

        {/* Link to login page */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-red-600 font-medium hover:underline"
          >
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
