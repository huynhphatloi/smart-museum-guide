import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ZonePage } from './pages/ZonePage';

/** Keeps the zone code while sending an alias path to the canonical /q route. */
function ZoneAliasRedirect() {
  const { zoneCode } = useParams<{ zoneCode: string }>();
  if (!zoneCode) return <Navigate to="/" replace />;
  return <Navigate to={`/q/${zoneCode}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* The QR code encodes this route: /q/ZONE_A01 */}
        <Route path="/q/:zoneCode" element={<ZonePage />} />
        {/* Alias kept for older stickers: /zones/ZONE_A01 -> /q/ZONE_A01. */}
        <Route path="/zones/:zoneCode" element={<ZoneAliasRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
