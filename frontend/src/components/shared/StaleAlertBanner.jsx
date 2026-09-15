import React from 'react';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';

export default function StaleAlertBanner({ alerts = [], onNavigate = null }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-amber-100 rounded-lg text-amber-800 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
              <span>Stale Evidence Lifecycle Warning</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900">
                {alerts.length} Flagged Item{alerts.length > 1 ? 's' : ''}
              </span>
            </h4>
            <p className="text-xs text-amber-800/90 mt-1">
              Detected by PL/SQL Cursor procedure <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900">sp_flag_stale_evidence</code>. 
              Evidence items stagnant in a non-final status for over 30 days require custodial review.
            </p>

            <div className="mt-3 space-y-1.5">
              {alerts.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-amber-900 bg-amber-100/60 px-2.5 py-1.5 rounded-md">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span className="font-medium">Evidence #{item.evidenceId}:</span>
                  <span className="truncate max-w-md">{item.description}</span>
                  <span className="ml-auto font-semibold tabular-nums text-amber-800">{item.days} days in status &quot;{item.status}&quot;</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={onNavigate}
            className="text-xs font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1 shrink-0 p-1 hover:underline"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
