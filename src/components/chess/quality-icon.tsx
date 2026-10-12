import { BookOpen, Check, Star, ThumbsUp, X, type LucideIcon } from "lucide-react";
import { LABELS, type MoveLabel } from "@/lib/move-quality";

const ICONS: Partial<Record<MoveLabel, LucideIcon>> = {
  book: BookOpen,
  best: Star,
  excellent: ThumbsUp,
  good: Check,
  miss: X,
};
const FILLED: MoveLabel[] = ["best", "excellent"];

// The round badge for a move rating: an annotation symbol (!!, ?!, …) or an
// icon. Drawn as one SVG so it scales cleanly, from the move list to the board.
export function QualityIcon({
  label,
  size,
  className = "",
}: {
  label: MoveLabel;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[label];
  const { name, symbol } = LABELS[label];
  return (
    <svg
      className={`quality-icon q-${label} ${className}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={name}
    >
      <title>{name}</title>
      <circle cx="12" cy="12" r="12" />
      {Icon ? (
        <Icon
          x={5.5}
          y={5.5}
          width={13}
          height={13}
          strokeWidth={label === "book" ? 2.4 : 3}
          color="#fff"
          fill={FILLED.includes(label) ? "#fff" : "none"}
          aria-hidden="true"
        />
      ) : (
        <text x="12" y="16.3" textAnchor="middle">
          {symbol}
        </text>
      )}
    </svg>
  );
}
