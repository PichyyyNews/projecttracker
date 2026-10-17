import { pgTable, serial, integer, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"), // null if registered with Google
  role: varchar("role", { length: 50 }).notNull().default("student"), // admin, advisor, instructor, student
  avatarUrl: text("avatar_url"),
  provider: varchar("provider", { length: 50 }).notNull().default("credentials"), // credentials, google
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, suspended
  studentId: varchar("student_id", { length: 50 }), // รหัสนักศึกษา
  phone: varchar("phone", { length: 50 }), // เบอร์โทรศัพท์
  department: varchar("department", { length: 255 }), // แผนก
  major: varchar("major", { length: 255 }), // สาขา
  yearLevel: varchar("year_level", { length: 50 }), // ชั้นปี
  studyGroup: varchar("study_group", { length: 50 }), // กลุ่มเรียน
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const academicClasses = pgTable("academic_classes", {
  id: serial("id").primaryKey(),
  yearLevel: varchar("year_level", { length: 50 }).notNull(), // เช่น ปวส ปี 1, ปวส ปี 2
  studyGroup: varchar("study_group", { length: 50 }).notNull(), // เช่น 1, 2, 3, 4
  major: varchar("major", { length: 255 }).notNull(), // เช่น เทคโนโลยีคอมพิวเตอร์ (สทค)
  departmentId: serial("department_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemConfigs = pgTable("system_configs", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // Project title / หัวข้อโปรเจค
  subjectName: varchar("subject_name", { length: 255 }).notNull(), // Course/Subject name / ชื่อวิชา
  description: text("description"),
  creatorId: integer("creator_id").references(() => users.id, { onDelete: "cascade" }), // Student creator
  advisorId: integer("advisor_id").references(() => users.id, { onDelete: "set null" }), // Advisor teacher
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, active, completed, rejected, archived
  tier: varchar("tier", { length: 50 }).notNull().default("standard"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("member"), // leader, member, advisor
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, accepted, rejected
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: serial("project_id").references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("todo"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id, { onDelete: "cascade" }), // null if system
  receiverId: integer("receiver_id").references(() => users.id, { onDelete: "cascade" }), // null if broadcast/ticket to admin
  subject: varchar("subject", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("direct"), // direct, system, ticket
  status: varchar("status", { length: 50 }).notNull().default("unread"), // unread, read, archived, resolved
  parentId: integer("parent_id"), // for threaded replies
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  stage: integer("stage").notNull(), // 25, 50, 75, 100
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  goalScope: text("goal_scope"),
  deliverableLinks: text("deliverable_links"), // JSON array of string links
  deliverableFiles: text("deliverable_files"), // JSON array of file paths / urls
  submissionNote: text("submission_note"),
  status: varchar("status", { length: 50 }).notNull().default("locked"), // locked, in_progress, pending_inspection, needs_revision, approved
  feedbackNotes: text("feedback_notes"),
  qrToken: varchar("qr_token", { length: 255 }),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: integer("approved_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const milestoneTasks = pgTable("milestone_tasks", {
  id: serial("id").primaryKey(),
  milestoneId: integer("milestone_id").references(() => milestones.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  assignedUserId: integer("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
export type AcademicClass = typeof academicClasses.$inferSelect;
export type NewAcademicClass = typeof academicClasses.$inferInsert;
export type SystemConfig = typeof systemConfigs.$inferSelect;
export type NewSystemConfig = typeof systemConfigs.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type NewProjectMember = typeof projectMembers.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
export type MilestoneTask = typeof milestoneTasks.$inferSelect;
export type NewMilestoneTask = typeof milestoneTasks.$inferInsert;
