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
  const avatarSrc = src || "/default-avatar.svg";

  return (
    <img
      src={avatarSrc}
      alt={name || "User Avatar"}
      width={size}
      height={size}
      className={`rounded-full object-cover shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export default UserAvatar;
