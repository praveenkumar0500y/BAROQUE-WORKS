import React, { useState, useEffect } from 'react';
import { CheckCircle2, Globe, X } from 'lucide-react';
import { fetchApiSettings } from '../api';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FreeService {
  id: string;
  name: string;
  purpose: string;
  free_tier: string;
  connected: boolean;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
  const [services, setServices] = useState<FreeService[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    fetchApiSettings()
      .then((data) => {
        if (Array.isArray(data?.services)) {
          setServices(data.services);
        }
      })
      .catch(console.error);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#141413]/60 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="services-modal-title"
        className="animate-modal-enter bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[8px] max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[var(--forest-tint)] text-[var(--forest)] flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <h3
                id="services-modal-title"
                className="font-display text-lg font-semibold text-[var(--text-primary)]"
              >
                Built-In Free Services
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Open routing, weather, and speech services — zero paid keys required
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-[6px] hover:bg-[var(--bg-hover)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-6 space-y-3 overflow-y-auto flex-1 text-xs">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="p-3.5 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-[6px] flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-semibold text-[var(--text-primary)]">{svc.name}</div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{svc.purpose}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--status-ok)] shrink-0">
                <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                <span>Free · Active</span>
              </span>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-inset)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-medium text-sm rounded-[6px] cursor-pointer active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
