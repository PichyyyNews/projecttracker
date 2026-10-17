import React from "react";
import { ShieldCheck, GraduationCap, ChalkboardTeacher, Student } from "@phosphor-icons/react";
import { UserRole } from "@/lib/roles";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number; // size in px, default 28
  className?: string;
  role?: string | null; // optional role to render badge icon at bottom-left
  showRoleBadge?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  size = 28,
  className = "",
  role,
  showRoleBadge = false,
}) => {
  const avatarSrc = src || "/default-avatar.svg";

  // Calculate badge size proportional to avatar size
  const badgeSize = Math.max(12, Math.round(size * 0.45));
  const iconSize = Math.max(8, Math.round(badgeSize * 0.7));

  const renderRoleIcon = (userRole?: string | null) => {
    switch (userRole) {
      case "admin":
        return <ShieldCheck weight="fill" size={iconSize} className="text-red-600 dark:text-red-400" />;
      case "advisor":
        return <GraduationCap weight="fill" size={iconSize} className="text-amber-600 dark:text-amber-400" />;
      case "instructor":
        return <ChalkboardTeacher weight="fill" size={iconSize} className="text-blue-600 dark:text-blue-400" />;
      case "student":
        return <Student weight="fill" size={iconSize} className="text-zinc-600 dark:text-zinc-400" />;
      default:
        return null;
    }
  };

  const roleTitle = role
    ? role === "advisor"
      ? "Project Advisor"
      : role === "instructor"
      ? "Course Instructor"
      : role === "admin"
      ? "Administrator"
      : "Student"
    : undefined;

  const roleIconElement = showRoleBadge && role ? renderRoleIcon(role) : null;

  return (
    <div className="relative inline-flex shrink-0 select-none" style={{ width: size, height: size }}>
      <img
        src={avatarSrc}
        alt={name || "User Avatar"}
        width={size}
        height={size}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
      {roleIconElement && (
        <span
          title={roleTitle}
          className="absolute -bottom-0.5 -left-0.5 flex items-center justify-center rounded-full bg-kumo-base ring-1 ring-kumo-line shadow-xs"
          style={{ width: badgeSize, height: badgeSize }}
        >
          {roleIconElement}
        </span>
      )}
    </div>
  );
};

export default UserAvatar;
