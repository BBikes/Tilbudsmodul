'use client';

import { ImageOff } from 'lucide-react';

export function ImageSelector() {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center gap-3 text-sm text-gray-400">
      <ImageOff size={16} className="flex-shrink-0" />
      <span>Billeder ikke tilgængelige via API i denne version. Tilføjes, når BikeDesk-endpunkt er bekræftet.</span>
    </div>
  );
}
