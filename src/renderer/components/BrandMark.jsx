import crewDeckIcon from "../assets/crewdeck-icon.png";

export default function BrandMark({ className = "" }) {
  return (
    <img
      className={`crewdeck-brand-mark ${className}`.trim()}
      src={crewDeckIcon}
      alt=""
      aria-hidden="true"
    />
  );
}
