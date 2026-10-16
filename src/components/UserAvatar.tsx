import React from "react";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number; // size in px, default 28
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  size = 28,
  className = "",
}) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name || "User Avatar"}
        width={size}
        height={size}
        className={`rounded-full object-cover ring ring-kumo-line shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // Exact default Google / modern gray avatar placeholder
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-full shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: "#F0F2F5",
      }}
      title={name || "User"}
    >
      <svg
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Subtle circular background */}
        <circle cx="128" cy="128" r="128" fill="#F0F2F5" />
        
        {/* Head */}
        <circle cx="128" cy="94" r="39" fill="#5F6368" />
        
        {/* Shoulders / Torso */}
        <path
          d="M60 206C60 168.445 90.4447 138 128 138C165.555 138 196 168.445 196 206V206H60V206Z"
          fill="#5F6368"
        />
      </svg>
    </div>
  );
};

export default UserAvatar;
