"use client";

import { useState, useCallback } from "react";
import LogoUpload from "./LogoUpload";
import EditAddressAutocomplete from "./EditAddressAutocomplete";
import { updateClub } from "@/app/clubs/[clubId]/edit/actions";

interface Club {
  id: string;
  club_name: string;
  district: string | null;
  description: string | null;
  contact_email: string | null;
  address: string | null;
  logo_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  rednote_url: string | null;
  youtube_url: string | null;
  x_url: string | null;
}

const SOCIAL_FIELDS = [
  {
    key: "facebook_url",
    label: "Facebook",
    placeholder: "https://facebook.com/yourclub",
  },
  {
    key: "instagram_url",
    label: "Instagram",
    placeholder: "https://instagram.com/yourclub",
  },
  { key: "x_url", label: "X (Twitter)", placeholder: "https://x.com/yourclub" },
  {
    key: "youtube_url",
    label: "YouTube",
    placeholder: "https://youtube.com/@yourclub",
  },
  {
    key: "rednote_url",
    label: "RedNote",
    placeholder: "https://rednote.com/yourclub",
  },
];

export default function EditClubForm({ club }: { club: Club }) {
  // Track logo URL in state so it can be passed as hidden input
  const [logoUrl, setLogoUrl] = useState<string>(club.logo_url ?? "");

  const updateClubWithId = updateClub.bind(null, club.id);

  return (
    <form action={updateClubWithId} className="space-y-6">
      {/* Hidden input carries logo URL to server action */}
      <input type="hidden" name="logo_url" value={logoUrl} />

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4">Club Logo</h2>
        <LogoUpload
          clubId={club.id}
          currentLogoUrl={club.logo_url}
          onUploadComplete={(url) => setLogoUrl(url)}
        />
      </div>

      {/* ── Basic Info ────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-lg">Basic Information</h2>

        {/* Club name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Club Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="club_name"
            required
            defaultValue={club.club_name}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
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
            defaultValue={club.district ?? ""}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description <span className="text-gray-500">(optional)</span>
          </label>
          <textarea
            name="description"
            rows={4}
            defaultValue={club.description ?? ""}
            placeholder="Tell players about your club..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none"
          />
        </div>

        {/* Contact email */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Contact Email <span className="text-gray-500">(optional)</span>
          </label>
          <input
            type="email"
            name="contact_email"
            defaultValue={club.contact_email ?? ""}
            placeholder="club@example.com"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* ── Location ──────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-lg">Location</h2>
        <EditAddressAutocomplete currentAddress={club.address ?? null} />
      </div>

      {/* ── Social Media ──────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-lg">Social Media</h2>
        <p className="text-gray-500 text-sm -mt-2">
          {"Add links to your club's social media pages"}
        </p>

        {SOCIAL_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {field.label}
            </label>
            <input
              type="url"
              name={field.key}
              defaultValue={(club[field.key as keyof Club] as string) ?? ""}
              placeholder={field.placeholder}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>
        ))}
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        Save Changes
      </button>
    </form>
  );
}
