"use client";

import { useState, useCallback } from "react";
import AddressAutocomplete from "./AddressAutocomplete";

export default function EditAddressAutocomplete({
  currentAddress,
}: {
  currentAddress: string | null;
}) {
  const [selectedAddress, setSelectedAddress] = useState("");

  const handleAddressSelect = useCallback(
    (address: string, lat: number, lng: number) => {
      setSelectedAddress(address);
    },
    [],
  );

  return (
    <div>
      {/* Current address display */}
      {currentAddress && (
        <div className="bg-gray-800 rounded-lg px-4 py-3 text-sm text-gray-300 mb-4">
          <p className="text-gray-500 text-xs mb-1">Current address</p>
          {currentAddress}
        </div>
      )}

      {/* Label */}
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Update Address <span className="text-gray-500">(optional)</span>
      </label>

      {/* Autocomplete input */}
      <AddressAutocomplete onAddressSelect={handleAddressSelect} />

      {/* Confirmation */}
      {selectedAddress && (
        <p className="text-green-400 text-xs mt-2">
          ✓ Selected: {selectedAddress}
        </p>
      )}

      {/* Hidden inputs carry values to server action */}
      <input type="hidden" name="address" value={selectedAddress} />
      <input type="hidden" name="latitude" id="latitude-hidden" />
      <input type="hidden" name="longitude" id="longitude-hidden" />

      <p className="text-gray-500 text-xs mt-1">
        Leave blank to keep current address
      </p>
    </div>
  );
}
