import { Star } from "lucide-react";

export const Stars = ({
  score,
  size = "sm",
}: {
  score: number | null;
  size?: "sm" | "lg";
}) => (
  <span className="inline-flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`${size === "lg" ? "h-6 w-6" : "h-3.5 w-3.5"} ${
          n <= (score ?? 0)
            ? "fill-amber-400 text-amber-400"
            : "fill-transparent text-gray-300"
        }`}
      />
    ))}
  </span>
);

export default Stars;
