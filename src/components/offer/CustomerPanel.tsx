import type { BikedeskCustomer, BikedeskTicket } from '@/types';
import { Phone, Mail, MapPin, Hash } from 'lucide-react';

interface CustomerPanelProps {
  workOrderId: string;
  ticket: BikedeskTicket & Record<string, unknown>;
  customer: BikedeskCustomer;
}

export function CustomerPanel({ workOrderId, ticket, customer }: CustomerPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Sag</p>
        <p className="text-lg font-bold text-gray-900">#{workOrderId}</p>
        {ticket.cardno && (
          <p className="text-xs text-gray-400 mt-0.5">Kortnr. {ticket.cardno}</p>
        )}
      </div>

      <div className="border-t border-gray-50 pt-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Kunde</p>
        <p className="font-semibold text-gray-900 mb-2">{customer.name}</p>
        <div className="space-y-1.5">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <Phone size={13} className="text-gray-400 flex-shrink-0" />
              {customer.phone}
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 break-all"
            >
              <Mail size={13} className="text-gray-400 flex-shrink-0" />
              {customer.email}
            </a>
          )}
          {customer.address && (
            <div className="flex items-start gap-2 text-sm text-gray-500">
              <MapPin size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <span>
                {customer.address}
                {customer.zipcode && `, ${customer.zipcode}`}
                {customer.city && ` ${customer.city}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {ticket.description && (
        <div className="border-t border-gray-50 pt-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Beskrivelse</p>
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">{ticket.description}</p>
        </div>
      )}

      <div className="border-t border-gray-50 pt-4">
        <div className="flex items-center gap-2">
          <Hash size={12} className="text-gray-300" />
          <span className="text-xs text-gray-400">Status: {ticket.status}</span>
        </div>
      </div>
    </div>
  );
}
