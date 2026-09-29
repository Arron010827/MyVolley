"use client";

import { useEffect, useRef } from "react";

// These are the props this component receives from the parent form
interface Props {
  onAddressSelect: (address: string, lat: number, lng: number) => void;
}

// Extend the Window type so TypeScript knows about google.maps
declare global {
  interface Window {
    google: typeof google;
    initAutocomplete: () => void;
  }
}

declare global {
  interface Window {
    google: typeof google;
    initAutocomplete: () => void;
    initMap: () => void; // ← add this line
  }
}

export default function AddressAutocomplete({ onAddressSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Wait for Google Maps to load, then initialise autocomplete
    function initAutocomplete() {
      if (!inputRef.current) return;

      // Create autocomplete instance restricted to Malaysia
      const autocomplete = new google.maps.places.Autocomplete(
        inputRef.current,
        {
          componentRestrictions: { country: "my" }, // Malaysia only
          fields: ["formatted_address", "geometry"], // only fetch what we need
          types: ["establishment", "geocode"], // businesses + addresses
        },
      );

      // When user selects a suggestion from the dropdown
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();

        if (!place.geometry?.location) return;

        const address = place.formatted_address ?? "";
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        // Send the selected address + coordinates up to the parent form
        onAddressSelect(address, lat, lng);
      });
    }

    // If Google Maps is already loaded, initialise immediately
    if (window.google?.maps?.places) {
      initAutocomplete();
      return;
    }

    // Otherwise wait for the script to finish loading
    window.initAutocomplete = initAutocomplete;
  }, [onAddressSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder="Start typing an address or venue name..."
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
    />
  );
}
