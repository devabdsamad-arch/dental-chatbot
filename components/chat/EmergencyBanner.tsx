"use client";

import { Phone } from "lucide-react";

interface EmergencyBannerProps {
  phone: string;
}

export function EmergencyBanner({ phone }: EmergencyBannerProps) {
  return (
    <div className="mx-3 mb-2 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
        <Phone className="w-4 h-4 text-red-600" />
      </div>
      <div>
        <p className="text-xs font-semibold text-red-700">Dental Emergency?</p>
        <a
          href={`tel:${phone}`}
          className="text-sm font-bold text-red-600 hover:underline"
        >
          Call us now: {phone}
        </a>
      </div>
    </div>
  );
}
