import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c6ff1f" stopOpacity=".22"/>
            <stop offset="100%" stopColor="#c6ff1f" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="barFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c6ff1f" stopOpacity="1"/>
            <stop offset="100%" stopColor="#c6ff1f" stopOpacity=".04"/>
          </linearGradient>
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <rect x="8" y="8" width="224" height="224" rx="48" fill="#111"/>
        <rect x="8" y="8" width="224" height="224" rx="48" fill="none" stroke="#c6ff1f" strokeWidth=".6" opacity=".12"/>

        <g className="spin-cw" opacity=".7" style={{ transformOrigin: '120px 120px', animation: 'spinSlow 50s linear infinite' }}>
          <rect x="28" y="28" width="184" height="184" rx="3" fill="none" stroke="#c6ff1f" strokeWidth=".5" opacity=".07" transform="rotate(0,120,120)"/>
          <rect x="32" y="32" width="176" height="176" rx="3" fill="none" stroke="#c6ff1f" strokeWidth=".5" opacity=".08" transform="rotate(5,120,120)"/>
          <rect x="36" y="36" width="168" height="168" rx="3" fill="none" stroke="#c6ff1f" strokeWidth=".5" opacity=".09" transform="rotate(10,120,120)"/>
        </g>

        <g className="spin-ccw" opacity=".75" style={{ transformOrigin: '120px 120px', animation: 'spinSlowRev 65s linear infinite' }}>
          <rect x="40" y="40" width="160" height="160" rx="3" fill="none" stroke="#c6ff1f" strokeWidth=".55" opacity=".10" transform="rotate(15,120,120)"/>
          <rect x="44" y="44" width="152" height="152" rx="3" fill="none" stroke="#c6ff1f" strokeWidth=".55" opacity=".12" transform="rotate(20,120,120)"/>
          <rect x="48" y="48" width="144" height="144" rx="3" fill="none" stroke="#c6ff1f" strokeWidth=".55" opacity=".14" transform="rotate(25,120,120)"/>
        </g>

        <rect x="52" y="52" width="136" height="136" rx="2" fill="none" stroke="#c6ff1f" strokeWidth=".6" opacity=".16" transform="rotate(30,120,120)"/>
        <rect x="56" y="56" width="128" height="128" rx="2" fill="none" stroke="#c6ff1f" strokeWidth=".6" opacity=".18" transform="rotate(33,120,120)"/>
        <rect x="60" y="60" width="120" height="120" rx="2" fill="none" stroke="#c6ff1f" strokeWidth=".65" opacity=".20" transform="rotate(36,120,120)"/>
        <rect x="64" y="64" width="112" height="112" rx="2" fill="none" stroke="#c6ff1f" strokeWidth=".65" opacity=".22" transform="rotate(39,120,120)"/>
        <rect x="68" y="68" width="104" height="104" rx="2" fill="none" stroke="#c6ff1f" strokeWidth=".7" opacity=".24" transform="rotate(42,120,120)"/>
        <rect x="72" y="72" width="96" height="96" rx="2" fill="none" stroke="#c6ff1f" strokeWidth=".7" opacity=".26" transform="rotate(45,120,120)"/>

        <path d="M42 90 L56 84 L68 88 L80 76 L92 80 L104 70 L120 74 L132 64 L144 68 L156 58 L168 62 L180 54 L198 48 L198 96 L42 96 Z" fill="url(#areaFill)"/>
        <path filter="url(#glow)" d="M42 90 L56 84 L68 88 L80 76 L92 80 L104 70 L120 74 L132 64 L144 68 L156 58 L168 62 L180 54 L198 48" stroke="#c6ff1f" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ strokeDasharray: 500, animation: 'drawLine 2s ease-out forwards' }}/>

        <g fill="#c6ff1f">
          <circle cx="56" cy="84" r="2.5" opacity=".7" style={{ transformOrigin: 'center', transformBox: 'fill-box', animation: 'pulse 2.8s ease-in-out infinite' }}/>
          <circle cx="80" cy="76" r="2.8" opacity=".8" style={{ transformOrigin: 'center', transformBox: 'fill-box', animation: 'pulse 2.8s ease-in-out infinite', animationDelay: '0.5s' }}/>
          <circle cx="104" cy="70" r="2.8" opacity=".85" style={{ transformOrigin: 'center', transformBox: 'fill-box', animation: 'pulse 2.8s ease-in-out infinite', animationDelay: '1s' }}/>
          <circle cx="132" cy="64" r="2.8" opacity=".8" style={{ transformOrigin: 'center', transformBox: 'fill-box', animation: 'pulse 2.8s ease-in-out infinite' }}/>
          <circle cx="156" cy="58" r="2.8" opacity=".85" style={{ transformOrigin: 'center', transformBox: 'fill-box', animation: 'pulse 2.8s ease-in-out infinite', animationDelay: '0.5s' }}/>
          <circle cx="180" cy="54" r="2.5" opacity=".7" style={{ transformOrigin: 'center', transformBox: 'fill-box', animation: 'pulse 2.8s ease-in-out infinite', animationDelay: '1s' }}/>
        </g>

        <circle cx="198" cy="48" r="4.5" fill="#fff" filter="url(#glow)"/>
        <circle cx="198" cy="48" r="8" fill="#fff" opacity=".12"/>
        <circle cx="42" cy="90" r="3" fill="#c6ff1f" opacity=".5"/>
        <line x1="38" y1="96" x2="202" y2="96" stroke="#c6ff1f" strokeWidth=".6" opacity=".25" strokeDasharray="3 3"/>

        <g>
          <rect x="112" y="100" width="16" height="14" rx="2" fill="#c6ff1f" opacity=".95"/>
          <rect x="112" y="118" width="16" height="12" rx="2" fill="#c6ff1f" opacity=".78"/>
          <rect x="112" y="134" width="16" height="10" rx="2" fill="#c6ff1f" opacity=".60"/>
          <rect x="112" y="148" width="16" height="9" rx="2" fill="#c6ff1f" opacity=".44"/>
          <rect x="112" y="161" width="16" height="7" rx="2" fill="#c6ff1f" opacity=".30"/>
          <rect x="112" y="172" width="16" height="6" rx="2" fill="#c6ff1f" opacity=".18"/>
          <rect x="112" y="182" width="16" height="5" rx="2" fill="#c6ff1f" opacity=".10"/>
          <rect x="112" y="191" width="16" height="4" rx="2" fill="#c6ff1f" opacity=".05"/>
        </g>

        <circle cx="120" cy="74" r="6" fill="#111" stroke="#c6ff1f" strokeWidth="2"/>
        <circle cx="120" cy="74" r="2.5" fill="#c6ff1f"/>

        <g stroke="#c6ff1f" strokeWidth="1.2" fill="none" opacity=".4">
          <path d="M26 42 L26 26 L42 26"/>
          <path d="M214 42 L214 26 L198 26"/>
          <path d="M26 198 L26 214 L42 214"/>
          <path d="M214 198 L214 214 L198 214"/>
        </g>

        <text x="196" y="42" fill="#fff" fontSize="7" fontFamily="monospace" opacity=".7" textAnchor="end">97.2</text>
      </svg>
      <style>{`
        @keyframes spinSlow { to { transform: rotate(360deg); } }
        @keyframes spinSlowRev { to { transform: rotate(-360deg); } }
        @keyframes pulse { 0%, 100% { opacity: .55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.35); } }
        @keyframes drawLine { from { stroke-dashoffset: 500; } to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );
};

export const Wordmark: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`text-center flex flex-col items-center justify-center ${className}`}>
      <div className="font-extrabold tracking-tight leading-none text-4xl">
        <span className="text-[#c6ff1f]">Tac</span>
        <span className="text-white">Stem</span>
      </div>
      <div className="mt-2 text-[#888] text-[11px] tracking-[5px] uppercase font-semibold">
        Football Analysis
      </div>
    </div>
  );
};
