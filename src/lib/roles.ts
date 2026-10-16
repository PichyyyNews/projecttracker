export type UserRole = "admin" | "advisor" | "instructor" | "student";

export interface RoleConfig {
  key: UserRole;
  label: string;
  badgeVariant: "error" | "warning" | "info" | "neutral" | "success";
  description: string;
}

export const USER_ROLES: Record<UserRole, RoleConfig> = {
  admin: {
    key: "admin",
    label: "Admin",
    badgeVariant: "error",
    description: "System Administrator with full access",
  },
  advisor: {
    key: "advisor",
    label: "Project Advisor",
    badgeVariant: "warning",
    description: "Project advisor overseeing student projects",
  },
  instructor: {
    key: "instructor",
    label: "Course Instructor",
    badgeVariant: "info",
    description: "Course instructor evaluating student projects",
  },
  student: {
    key: "student",
    label: "Student",
    badgeVariant: "neutral",
    description: "Student member managing project deliverables",
  },
};

export const ROLE_OPTIONS = Object.values(USER_ROLES);
