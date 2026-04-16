import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for leaflet's default icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/node_modules/leaflet/dist/images/marker-icon-2x.png',
  iconUrl: '/node_modules/leaflet/dist/images/marker-icon.png',
  shadowUrl: '/node_modules/leaflet/dist/images/marker-shadow.png',
});

export default function DeliveryMap({ drivers = [] }) {
  const center = [35.1697, -1.3218];
  return (
    <div className="panel rounded-xl shadow-sm">
      <h3 className="table-headline">Carte des livreurs</h3>
      <div style={{ height: 420 }} className="mt-3">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {drivers.map((d) => (
            <Marker key={d.id} position={[d.lat, d.lng]}>
              <Popup>
                {d.name}
                <br />Statut: {d.status}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
