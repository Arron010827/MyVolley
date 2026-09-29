"use client";

import { useEffect, useRef } from "react";

interface Club {
  id: string;
  club_name: string;
  district: string | null;
  state: string;
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  clubs: Club[];
}

export default function ClubsMap({ clubs }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Filter to only clubs that have coordinates
    const mappableClubs = clubs.filter((c) => c.latitude && c.longitude);

    function initMap() {
      if (!mapRef.current || !window.google) return;

      // Centre the map on Malaysia
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 4.2105, lng: 101.9758 }, // centre of Malaysia
        zoom: 6,
        styles: [
          // Dark theme to match the site
          { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
          {
            elementType: "labels.text.stroke",
            stylers: [{ color: "#1a1a2e" }],
          },
          { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#374151" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#111827" }],
          },
          { featureType: "poi", stylers: [{ visibility: "off" }] },
        ],
      });

      // Add a pin for each club that has coordinates
      mappableClubs.forEach((club) => {
        const marker = new google.maps.Marker({
          position: { lat: club.latitude!, lng: club.longitude! },
          map,
          title: club.club_name,
          icon: {
            // Custom red pin to match site theme
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#dc2626",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        // Info window — pops up when you click a pin
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="
              background: #1f2937;
              color: white;
              padding: 10px 14px;
              border-radius: 8px;
              min-width: 150px;
            ">
              <p style="font-weight: 600; margin: 0 0 4px 0;">${club.club_name}</p>
              <p style="color: #9ca3af; font-size: 13px; margin: 0;">
                ${club.district ?? club.state}
              </p>
              <a href="/clubs/${club.id}" style="
                display: inline-block;
                margin-top: 8px;
                color: #f87171;
                font-size: 13px;
                text-decoration: none;
              ">View club →</a>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(map, marker);
        });
      });
    }

    // If Google Maps already loaded, init immediately
    if (window.google?.maps) {
      initMap();
      return;
    }

    // Otherwise wait for the script callback
    window.initMap = initMap;
  }, [clubs]);

  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-800">
      {/* Map container — Google Maps renders inside this div */}
      <div ref={mapRef} className="w-full h-[80vh]" />
    </div>
  );
}
