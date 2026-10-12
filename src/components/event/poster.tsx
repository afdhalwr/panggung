import type { Event } from "@/lib/schemas";

type Props = {
  event: Pick<Event, "id" | "title" | "artist" | "palette" | "pattern">;
  className?: string;
  showTitle?: boolean;
};

/** Poster SVG generatif: warna dan pola diambil dari data seed, jadi setiap event terlihat unik tanpa foto artis. */
export function Poster({ event, className, showTitle = true }: Props) {
  const [a, b] = event.palette;
  const gid = `g-${event.id}`;
  const words = event.artist.toUpperCase().split(" ");

  return (
    <svg viewBox="0 0 300 200" className={className} role="img" aria-label={`Poster ${event.title}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill={`url(#${gid})`} />
      <g stroke="#C6FF3D" strokeOpacity="0.55" fill="none" strokeWidth="2">
        <Pattern kind={event.pattern} />
      </g>
      {showTitle && (
        <text x="18" y={200 - 18 - (words.length - 1) * 30} fill="#F4F4F6" fontFamily="var(--font-bricolage), sans-serif" fontWeight="800" fontSize="30" letterSpacing="-0.5">
          {words.map((w, i) => (
            <tspan key={i} x="18" dy={i === 0 ? 0 : 30}>
              {w}
            </tspan>
          ))}
        </text>
      )}
    </svg>
  );
}

function Pattern({ kind }: { kind: Event["pattern"] }) {
  switch (kind) {
    case "rings":
      return (
        <>
          {[30, 55, 80, 105, 130].map((r) => (
            <circle key={r} cx="230" cy="110" r={r} />
          ))}
        </>
      );
    case "grid":
      return (
        <>
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={120 + i * 22} y1="0" x2={60 + i * 32} y2="200" />
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <line key={`h${i}`} x1="100" y1={40 + i * 28} x2="300" y2={40 + i * 28} />
          ))}
        </>
      );
    case "waves":
      return (
        <>
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} d={`M0 ${50 + i * 20} C 75 ${20 + i * 20}, 150 ${80 + i * 20}, 300 ${40 + i * 20}`} />
          ))}
        </>
      );
    case "bars":
      return (
        <>
          {[60, 110, 80, 150, 120, 170, 90, 140, 70].map((h, i) => (
            <rect key={i} x={140 + i * 17} y={200 - h} width="9" height={h} rx="4" />
          ))}
        </>
      );
    case "sun":
      return (
        <>
          <circle cx="220" cy="80" r="40" />
          {Array.from({ length: 12 }, (_, i) => {
            const t = (i / 12) * Math.PI * 2;
            // Dibulatkan: hasil trigonometri bisa beda di digit terakhir antara server dan browser (hydration mismatch).
            const r2 = (n: number) => Math.round(n * 100) / 100;
            return <line key={i} x1={r2(220 + Math.cos(t) * 52)} y1={r2(80 + Math.sin(t) * 52)} x2={r2(220 + Math.cos(t) * 90)} y2={r2(80 + Math.sin(t) * 90)} />;
          })}
        </>
      );
  }
}
