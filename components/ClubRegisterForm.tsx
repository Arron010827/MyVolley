"use client";

import { useState, useCallback } from "react";
import AddressAutocomplete from "./AddressAutocomplete";
import { createClub } from "@/app/clubs/register/actions";

// Malaysian states for the dropdown
const STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "W.P. Kuala Lumpur",
  "W.P. Labuan",
  "W.P. Putrajaya",
];

const EXPERIENCE_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "All levels",
];

export default function ClubRegisterForm() {
  // Store the address + coordinates selected from autocomplete
  const [selectedAddress, setSelectedAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Called by AddressAutocomplete when user picks a suggestion
  const handleAddressSelect = useCallback(
    (address: string, lat: number, lng: number) => {
      setSelectedAddress(address);
      setLatitude(lat);
      setLongitude(lng);
    },
    [],
  );

  return (
    <form action={createClub} className="space-y-6">
      {/* Club Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Club Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          name="club_name"
          required
          placeholder="e.g. KL Volleyball Club"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
        />
      </div>

      {/* State */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          State <span className="text-red-400">*</span>
        </label>
        <select
          name="state"
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
        >
          <option value="">— Select a state —</option>
          {STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>

      {/* District */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          District <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          name="district"
          required
          placeholder="e.g. Petaling Jaya"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
        />
        <p className="text-gray-500 text-xs mt-1">
          {"Enter your club's general area or district"}
        </p>
      </div>

      {/* Exact Address (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Exact Address <span className="text-gray-500">(optional)</span>
        </label>

        {/* Google Maps autocomplete input */}
        <AddressAutocomplete onAddressSelect={handleAddressSelect} />

        {/* Show selected address confirmation */}
        {selectedAddress && (
          <p className="text-green-400 text-xs mt-2">
            ✓ Selected: {selectedAddress}
          </p>
        )}

        {/* Hidden inputs carry the values into the server action */}
        <input type="hidden" name="address" value={selectedAddress} />
        <input type="hidden" name="latitude" value={latitude ?? ""} />
        <input type="hidden" name="longitude" value={longitude ?? ""} />

        <p className="text-gray-500 text-xs mt-1">
          {"Start typing to search for your club's venue or address"}
        </p>
      </div>

      {/* Experience Level */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Experience Level <span className="text-red-400">*</span>
        </label>
        <select
          name="experience_level"
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
        >
          <option value="">— Select level —</option>
          {EXPERIENCE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description <span className="text-gray-500">(optional)</span>
        </label>
        <textarea
          name="description"
          rows={4}
          placeholder="Tell players about your club..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none"
        />
      </div>

      {/* Contact Email */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Contact Email <span className="text-gray-500">(optional)</span>
        </label>
        <input
          type="email"
          name="contact_email"
          placeholder="club@example.com"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        Submit for Review
      </button>
    </form>
  );
}
