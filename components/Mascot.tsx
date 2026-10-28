import type { LevelId } from "@/lib/types";

/** Original in-house robot mascots, one per level. Flat shapes so they print and scale cleanly. */
export function Mascot({ level, size = 96, className = "" }: { level: LevelId; size?: number; className?: string }) {
  const ink = "#1B2A4A";
  const paper = "#FAF8F3";
  const common = { width: size, height: size, viewBox: "0 0 120 120", className, role: "img" as const };

  if (level === 1)
    // Bitsy — small, round, one bouncy antenna.
    return (
      <svg {...common} aria-label="Bitsy, the Level 1 robot">
        <line x1="60" y1="22" x2="60" y2="8" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="8" r="6" fill="#F5B841" stroke={ink} strokeWidth="3" />
        <circle cx="60" cy="66" r="44" fill="#F5B841" stroke={ink} strokeWidth="3.5" />
        <ellipse cx="60" cy="62" rx="30" ry="22" fill={paper} stroke={ink} strokeWidth="3" />
        <circle cx="48" cy="60" r="7" fill={ink} />
        <circle cx="72" cy="60" r="7" fill={ink} />
        <circle cx="50" cy="57" r="2.2" fill={paper} />
        <circle cx="74" cy="57" r="2.2" fill={paper} />
        <path d="M52 72 Q60 79 68 72" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        <circle cx="34" cy="74" r="4" fill="#F59E8B" opacity=".8" />
        <circle cx="86" cy="74" r="4" fill="#F59E8B" opacity=".8" />
      </svg>
    );

  if (level === 2)
    // Byte — rounded square, two antennas, screen face.
    return (
      <svg {...common} aria-label="Byte, the Level 2 robot">
        <path d="M40 22 L34 8 M80 22 L86 8" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        <circle cx="34" cy="8" r="4.5" fill="#22D3EE" stroke={ink} strokeWidth="2.5" />
        <circle cx="86" cy="8" r="4.5" fill="#22D3EE" stroke={ink} strokeWidth="2.5" />
        <rect x="16" y="20" width="88" height="84" rx="24" fill="#22D3EE" stroke={ink} strokeWidth="3.5" />
        <rect x="28" y="34" width="64" height="44" rx="12" fill={ink} />
        <rect x="40" y="46" width="10" height="14" rx="3" fill="#22D3EE" />
        <rect x="70" y="46" width="10" height="14" rx="3" fill="#22D3EE" />
        <path d="M50 68 H70" stroke="#22D3EE" strokeWidth="3" strokeLinecap="round" />
        <rect x="8" y="54" width="8" height="20" rx="4" fill={ink} />
        <rect x="104" y="54" width="8" height="20" rx="4" fill={ink} />
        <circle cx="60" cy="92" r="4" fill={paper} stroke={ink} strokeWidth="2" />
      </svg>
    );

  if (level === 3)
    // Cortex — tall dome with circuit "brain" lines.
    return (
      <svg {...common} aria-label="Cortex, the Level 3 robot">
        <path d="M20 70 Q20 14 60 14 Q100 14 100 70 V92 Q100 106 86 106 H34 Q20 106 20 92 Z" fill="#A78BFA" stroke={ink} strokeWidth="3.5" />
        <path d="M36 34 H52 V26 M60 18 V36 H76 M84 32 H70 V44" fill="none" stroke={paper} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="52" cy="26" r="3" fill={paper} />
        <circle cx="84" cy="32" r="3" fill={paper} />
        <rect x="30" y="54" width="60" height="30" rx="15" fill={paper} stroke={ink} strokeWidth="3" />
        <circle cx="47" cy="69" r="6" fill={ink} />
        <circle cx="73" cy="69" r="6" fill={ink} />
        <path d="M48 94 H72" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );

  if (level === 4)
    // Nova — sleek oval visor, star mark.
    return (
      <svg {...common} aria-label="Nova, the Level 4 robot">
        <ellipse cx="60" cy="62" rx="46" ry="48" fill={ink} stroke={ink} strokeWidth="3.5" />
        <path d="M60 18 l3.5 7.5 8 1-6 5.5 1.6 8L60 36l-7 4 1.6-8-6-5.5 8-1z" fill="#F5B841" />
        <rect x="22" y="52" width="76" height="26" rx="13" fill="#22D3EE" />
        <rect x="36" y="60" width="16" height="10" rx="5" fill={ink} />
        <rect x="68" y="60" width="16" height="10" rx="5" fill={ink} />
        <path d="M48 92 Q60 98 72 92" fill="none" stroke="#22D3EE" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );

  // Atlas — the mastery level: orbit ring and a globe-like head.
  return (
    <svg {...common} aria-label="Atlas, the Level 5 robot">
      <ellipse cx="60" cy="60" rx="56" ry="18" fill="none" stroke="#F5B841" strokeWidth="4" transform="rotate(-18 60 60)" />
      <circle cx="60" cy="60" r="40" fill="#F5B841" stroke={ink} strokeWidth="3.5" />
      <path d="M22 54 H98 M24 72 H96 M60 20 Q42 60 60 100 M60 20 Q78 60 60 100" fill="none" stroke={ink} strokeWidth="2" opacity=".35" />
      <rect x="34" y="48" width="52" height="24" rx="12" fill={ink} />
      <circle cx="49" cy="60" r="5" fill="#F5B841" />
      <circle cx="71" cy="60" r="5" fill="#F5B841" />
      <circle cx="108" cy="40" r="5" fill={ink} />
    </svg>
  );
}
