import Image from "next/image";

interface Props {
  clubName: string;
  logoUrl: string | null;
  size?: "sm" | "md" | "lg"; // controls the avatar size
}

// Size map — tailwind classes for each size variant
const SIZE_CLASSES = {
  sm: { container: "w-10 h-10", text: "text-sm" },
  md: { container: "w-16 h-16", text: "text-xl" },
  lg: { container: "w-20 h-20", text: "text-2xl" },
};

export default function ClubAvatar({ clubName, logoUrl, size = "md" }: Props) {
  const { container, text } = SIZE_CLASSES[size];
  const initial = clubName.charAt(0).toUpperCase();

  // If logo exists → show image, otherwise show initial letter
  if (logoUrl) {
    return (
      <div
        className={`${container} relative rounded-full overflow-hidden border-2 border-gray-700 flex-shrink-0`}
      >
        <Image
          src={logoUrl}
          alt={`${clubName} logo`}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${container} rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 border-2 border-red-400`}
    >
      <span className={`${text} font-bold text-white`}>{initial}</span>
    </div>
  );
}
