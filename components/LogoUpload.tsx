"use client";

import { useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
// import Image from "next/image";

interface Props {
  clubId: string;
  currentLogoUrl: string | null;
  onUploadComplete: (url: string) => void;
}

export default function LogoUpload({
  clubId,
  currentLogoUrl,
  onUploadComplete,
}: Props) {
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side file type validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG, WEBP, or GIF files are allowed");
      return;
    }

    // Client-side file size validation (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("File size must be under 2MB");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      // File path: clubId/timestamp.ext
      // Using clubId as folder ensures the storage policy matches
      const ext = file.name.split(".").pop();
      const filePath = `${clubId}/${Date.now()}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("club-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the public URL of the uploaded file
      const { data } = supabase.storage
        .from("club-logos")
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // Show preview and notify parent
      setPreview(publicUrl);
      onUploadComplete(publicUrl);
    } catch (err) {
      setError("Upload failed — please try again");
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex items-center gap-5">
        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-700 flex-shrink-0 bg-gray-800">
          {preview ? (
            <img
              src={preview}
              alt="Club logo preview"
              className="w-full h-full object-cover"
            />
          ) : (
            // Placeholder when no logo
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs text-center px-2">
              No logo
            </div>
          )}
        </div>

        <div className="flex-1">
          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Trigger button */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading
              ? "Uploading..."
              : preview
                ? "Change Logo"
                : "Upload Logo"}
          </button>

          <p className="text-gray-500 text-xs mt-2">
            JPG, PNG, WEBP or GIF — max 2MB
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Success message */}
      {preview && !uploading && preview !== currentLogoUrl && (
        <p className="text-green-400 text-sm">✓ Logo uploaded successfully</p>
      )}
    </div>
  );
}
