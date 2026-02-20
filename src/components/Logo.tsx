interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const SIZES = {
  sm: { icon: 24, text: "text-lg" },
  md: { icon: 32, text: "text-xl" },
  lg: { icon: 48, text: "text-3xl" },
};

export default function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const { icon, text } = SIZES[size];

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* Interlocking hexagon mark */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Back hexagon (tan/warm) */}
        <path
          d="M30.5 8L40.5 13.8v11.4L30.5 31 20.5 25.2V13.8L30.5 8z"
          fill="#C4A882"
        />
        {/* Front hexagon (black) */}
        <path
          d="M17.5 17L27.5 22.8v11.4L17.5 40 7.5 34.2V22.8L17.5 17z"
          fill="#1a1a1a"
        />
      </svg>
      {showText && (
        <span className={`font-bold tracking-tight ${text}`}>
          <span className="text-black">Glue</span>
          <span className="text-[#C4A882]">OS</span>
        </span>
      )}
    </span>
  );
}
