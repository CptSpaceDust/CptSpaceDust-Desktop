import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import mayuWalk1 from "../assets/mayu/mayu-walk-1.png";
import mayuWalk2 from "../assets/mayu/mayu-walk-2.png";
import mayuWalk3 from "../assets/mayu/mayu-walk-3.png";
import mayuWalk4 from "../assets/mayu/mayu-walk-4.png";
import mayuWalk5 from "../assets/mayu/mayu-walk-5.png";
import mayuWalk6 from "../assets/mayu/mayu-walk-6.png";
import BrandMark from "./BrandMark";

const walkFrames = [
  mayuWalk1,
  mayuWalk2,
  mayuWalk3,
  mayuWalk4,
  mayuWalk5,
  mayuWalk6,
];

export function MayuLoader({ mode = "walk", label, compact = false }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const reduced =
      document.documentElement.dataset.motion === "reduced" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setFrame(0);
      return undefined;
    }
    const timer = window.setInterval(
      () => setFrame((current) => (current + 1) % walkFrames.length),
      130,
    );
    return () => window.clearInterval(timer);
  }, [mode]);
  return (
    <div
      className={`mayu-loader mayu-loader-${mode} ${compact ? "compact" : ""}`}
    >
      {!compact && (
        <div className="mayu-loader-brand" aria-label="CrewDeck">
          <BrandMark />
          <strong>CrewDeck</strong>
        </div>
      )}
      <div className="mayu-loader-art" aria-hidden="true">
        <img className="mayu-walk-frame" src={walkFrames[frame]} alt="" />
      </div>
      <LoaderCircle className="mayu-loader-fallback spin" aria-hidden="true" />
      {label && <span>{label}</span>}
    </div>
  );
}
