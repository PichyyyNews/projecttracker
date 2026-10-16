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
    description: "ผู้ดูแลระบบ มีสิทธิ์สูงสุดในการจัดการผู้ใช้และระบบ",
  },
  advisor: {
    key: "advisor",
    label: "อาจารย์ที่ปรึกษา",
    badgeVariant: "warning",
    description: "อาจารย์ที่ปรึกษาโครงงาน/โปรเจกต์ ติดตามและให้คำแนะนำ",
  },
  instructor: {
    key: "instructor",
    label: "อาจารย์ประจำวิชา",
    badgeVariant: "info",
    description: "อาจารย์ผู้สอนประจำวิชา ประเมินและอนุมัติโปรเจกต์",
  },
  student: {
    key: "student",
    label: "user นักศึกษา",
    badgeVariant: "neutral",
    description: "นักศึกษาเจ้าของโปรเจกต์ ส่งงานและติดตามสถานะ",
  },
};

export const ROLE_OPTIONS = Object.values(USER_ROLES);
