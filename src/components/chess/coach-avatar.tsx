// Mira, the Gambit Academy coach. An original drawing in the site's palette.
export function CoachAvatar({ size = 96, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="Coach Mira"
    >
      <circle cx="60" cy="60" r="60" fill="#d9c8b4" />
      {/* hair behind the head */}
      <path d="M26 66c0-26 14-44 34-44s34 18 34 44v22H26z" fill="#5b3a2e" />
      {/* sweater */}
      <path d="M18 120c2-22 18-34 42-34s40 12 42 34z" fill="#9c4a3c" />
      <path d="M48 88l12 12 12-12" fill="none" stroke="#f3e6d8" strokeWidth="4" />
      {/* neck and face */}
      <rect x="51" y="74" width="18" height="16" rx="6" fill="#e9b996" />
      <ellipse cx="60" cy="58" rx="22" ry="25" fill="#f1c7a5" />
      {/* fringe */}
      <path
        d="M37 52c4-16 14-23 25-23 10 0 19 7 22 20-9-6-20-9-30-6-6 2-11 5-17 9z"
        fill="#5b3a2e"
      />
      {/* glasses */}
      <g fill="none" stroke="#3b2a24" strokeWidth="2">
        <circle cx="50" cy="60" r="7" />
        <circle cx="70" cy="60" r="7" />
        <path d="M57 60h6" />
      </g>
      <circle cx="50" cy="60" r="2.2" fill="#3b2a24" />
      <circle cx="70" cy="60" r="2.2" fill="#3b2a24" />
      {/* cheeks and smile */}
      <circle cx="44" cy="70" r="3.5" fill="#e79d84" opacity="0.6" />
      <circle cx="76" cy="70" r="3.5" fill="#e79d84" opacity="0.6" />
      <path
        d="M52 73c4 5 12 5 16 0"
        fill="none"
        stroke="#8a3b2f"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* pawn pin */}
      <g fill="#f3e6d8" transform="translate(80 100)">
        <circle cx="0" cy="-6" r="3" />
        <path d="M-3 -3h6l2 7h-10z" />
      </g>
    </svg>
  );
}
