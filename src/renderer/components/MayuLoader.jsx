import { LoaderCircle } from "lucide-react";
import mayuWalk from "../assets/mayu/mayu-walk.png";
import mayuUpdate from "../assets/mayu/mayu-update.png";

export function MayuLoader({ mode = "walk", label, compact = false }) {
  return (
    <div
      className={`mayu-loader mayu-loader-${mode} ${compact ? "compact" : ""}`}
    >
      <div className="mayu-loader-art" aria-hidden="true">
        {mode === "update" ? (
          <img src={mayuUpdate} alt="" />
        ) : (
          <div
            className="mayu-walk-sprite"
            style={{ backgroundImage: `url(${mayuWalk})` }}
          />
        )}
      </div>
      <LoaderCircle className="mayu-loader-fallback spin" aria-hidden="true" />
      {label && <span>{label}</span>}
    </div>
  );
}
