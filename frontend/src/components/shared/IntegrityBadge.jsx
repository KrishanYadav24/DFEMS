import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Shield, Copy, Check } from 'lucide-react';

export default function IntegrityBadge({
  hash,
  status = 'VERIFIED', // 'VERIFIED' | 'TAMPERED' | 'UNVERIFIED'
  showHash = false,
  truncate = true,
  onVerify = null,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusConfig = {
    VERIFIED: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600',
      label: 'Hash Verified',
    },
    TAMPERED: {
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: ShieldAlert,
      iconColor: 'text-rose-600',
      label: 'Tamper Detected',
    },
    UNVERIFIED: {
      bg: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: Shield,
      iconColor: 'text-gray-500',
      label: 'Pending Check',
    },
  };

  const current = statusConfig[status] || statusConfig.UNVERIFIED;
  const Icon = current.icon;

  const displayHash = hash
    ? truncate && hash.length > 16
      ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`
      : hash
    : 'No hash';

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        onClick={onVerify}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${current.bg} ${onVerify ? 'cursor-pointer hover:opacity-90' : ''}`}
        title={hash ? `SHA-256: ${hash}` : 'Hash not calculated'}
      >
        <Icon className={`w-3.5 h-3.5 ${current.iconColor}`} />
        <span>{current.label}</span>
      </span>

      {showHash && hash && (
        <span className="inline-flex items-center gap-1 text-xs hash-font text-app-muted bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
          <span>{displayHash}</span>
          <button
            onClick={handleCopy}
            className="hover:text-app-primary ml-1 transition-colors"
            title="Copy SHA-256 hash"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          </button>
        </span>
      )}
    </div>
  );
}
