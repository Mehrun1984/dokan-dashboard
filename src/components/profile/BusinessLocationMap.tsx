'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

type LatLng = {
  lat: number;
  lng: number;
};

type BusinessLocationMapProps = {
  center: LatLng;
  selectedLocation: LatLng | null;
  onLocationChange: (location: LatLng) => void;
};

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function RecenterMap({ center }: { center: LatLng }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
  }, [center, map]);

  return null;
}

function MapClickHandler({ onLocationChange }: { onLocationChange: (location: LatLng) => void }) {
  useMapEvents({
    click(event) {
      onLocationChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

export default function BusinessLocationMap({
  center,
  selectedLocation,
  onLocationChange,
}: BusinessLocationMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={14}
      className="h-72 w-full rounded-xl border border-gray-200 dark:border-gray-700"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap center={center} />
      <MapClickHandler onLocationChange={onLocationChange} />

      {selectedLocation ? (
        <Marker
          position={selectedLocation}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const marker = event.target as L.Marker;
              const position = marker.getLatLng();
              onLocationChange({ lat: position.lat, lng: position.lng });
            },
          }}
        />
      ) : null}
    </MapContainer>
  );
}
