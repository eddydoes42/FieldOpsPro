import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Companies table - for multi-company support
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  phone: varchar("phone"),
  email: varchar("email"),
  website: varchar("website"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  roles: text("roles").array().notNull().default(sql`ARRAY['field_agent']`), // array of: operations_director, administrator, manager, dispatcher, field_agent, client
  companyId: varchar("company_id").references(() => companies.id), // null for operations_director
  profileImageUrl: varchar("profile_image_url"),
  // Client-specific fields
  clientCompanyName: varchar("client_company_name"),
  clientRole: varchar("client_role"),
  // Manual login credentials for non-OAuth users
  username: varchar("username").unique(),
  passwordHash: varchar("password_hash"),
  temporaryPassword: boolean("temporary_password").default(false),
  mustChangePassword: boolean("must_change_password").default(false),
  lastLoginAt: timestamp("last_login_at"),
  isActive: boolean("is_active").default(true),
  isSuspended: boolean("is_suspended").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work Orders table
export const workOrders = pgTable("work_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  location: varchar("location").notNull(),
  scopeOfWork: text("scope_of_work"),
  requiredTools: text("required_tools"),
  pointOfContact: varchar("point_of_contact"),
  priority: varchar("priority").notNull().default("medium"), // low, medium, high, urgent
  status: varchar("status").notNull().default("scheduled"), // scheduled, confirmed, in_progress, pending, completed, cancelled
  assigneeId: varchar("assignee_id").references(() => users.id),
  createdById: varchar("created_by_id").references(() => users.id),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  confirmedAt: timestamp("confirmed_at"), // when agent confirms the work order
  // Budget tracking fields
  budgetType: varchar("budget_type"), // fixed, hourly, per_device, materials_plus_labor
  budgetAmount: decimal("budget_amount", { precision: 10, scale: 2 }), // base budget amount
  devicesInstalled: integer("devices_installed"), // number of devices for per_device budget type
  budgetCreatedById: varchar("budget_created_by_id").references(() => users.id),
  budgetCreatedAt: timestamp("budget_created_at"),
  // Payment workflow fields
  paymentStatus: varchar("payment_status"), // null, pending_payment, payment_approved, payment_received, paid
  paymentUpdatedById: varchar("payment_updated_by_id").references(() => users.id),
  paymentUpdatedAt: timestamp("payment_updated_at"),
  // Status tracking fields
  workStatus: varchar("work_status").notNull().default("not_started"), // not_started, in_route, checked_in, checked_out, completed
  checkedInAt: timestamp("checked_in_at"),
  checkedOutAt: timestamp("checked_out_at"),
  // Client work order fields
  isClientCreated: boolean("is_client_created").default(false), // true if created by client
  // Request assignment fields for job network
  requestStatus: varchar("request_status"), // null, pending_request, request_sent, request_accepted, request_declined
  requestedAgentId: varchar("requested_agent_id").references(() => users.id), // field agent requested for assignment
  requestedById: varchar("requested_by_id").references(() => users.id), // admin/manager/dispatcher who made the request
  requestedAt: timestamp("requested_at"),
  requestReviewedAt: timestamp("request_reviewed_at"),
  clientNotes: text("client_notes"), // client's notes when accepting/declining request
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Issues table for hazard reporting
export const issues = pgTable("issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  reportedById: varchar("reported_by_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  severity: varchar("severity").notNull().default("medium"), // low, medium, high, critical
  category: varchar("category").notNull(), // safety_hazard, equipment_issue, access_problem, other
  status: varchar("status").notNull().default("open"), // open, investigating, resolved, closed
  resolvedById: varchar("resolved_by_id").references(() => users.id),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  requiresManagerApproval: boolean("requires_manager_approval").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Agent performance history table for client review
export const agentPerformance = pgTable("agent_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  completionSuccess: boolean("completion_success").notNull(), // true if work completed successfully
  timeliness: varchar("timeliness").notNull(), // early, on_time, late
  issuesReported: integer("issues_reported").default(0), // number of issues reported
  clientRating: integer("client_rating"), // 1-5 star rating
  clientFeedback: text("client_feedback"), // client's written feedback
  createdAt: timestamp("created_at").defaultNow(),
});

// Time Tracking table
export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  workOrderId: varchar("work_order_id").references(() => workOrders.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  breakDuration: integer("break_duration").default(0), // in minutes
  notes: text("notes"),
  isActive: boolean("is_active").default(false), // true if currently clocked in
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  recipientId: varchar("recipient_id").references(() => users.id), // null for broadcast messages
  workOrderId: varchar("work_order_id").references(() => workOrders.id),
  subject: varchar("subject"),
  content: text("content").notNull(),
  priority: varchar("priority").default("normal"), // normal, high, urgent
  isRead: boolean("is_read").default(false),
  readAt: timestamp("readAt"), // timestamp when message was read
  messageType: varchar("message_type").default("direct"), // direct, broadcast, work_order
  createdAt: timestamp("created_at").defaultNow(),
});

// Work Order Tasks table
export const workOrderTasks = pgTable("work_order_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  title: varchar("title").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // pre_visit, on_site, post_site
  isCompleted: boolean("is_completed").default(false),
  completedById: varchar("completed_by_id").references(() => users.id),
  completedAt: timestamp("completed_at"),
  orderIndex: integer("order_index").default(0), // for ordering tasks within category
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work Order Issues table
export const workOrderIssues = pgTable("work_order_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  reason: varchar("reason").notNull(), // Schedule, Work Scope, Access, Personal/Other
  explanation: text("explanation").notNull(),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  status: varchar("status").default("open"), // open, resolved
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications table for work order confirmations
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  workOrderId: varchar("work_order_id").references(() => workOrders.id),
  type: varchar("type").notNull().default("work_order_confirmation"), // work_order_confirmation, general
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  isConfirmed: boolean("is_confirmed").default(false),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Client ratings for service companies (3 categories: Administration, Field Team, Overall)
export const clientServiceRatings = pgTable("client_service_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  // Rating categories (1-5 stars each)
  administrationRating: integer("administration_rating").notNull(), // Rating for managers/dispatchers
  fieldTeamRating: integer("field_team_rating").notNull(), // Rating for field agents
  overallRating: integer("overall_rating").notNull(), // Overall satisfaction
  // Optional feedback for each category
  administrationFeedback: text("administration_feedback"),
  fieldTeamFeedback: text("field_team_feedback"),
  overallFeedback: text("overall_feedback"),
  // Related users for context
  managerId: varchar("manager_id").references(() => users.id), // Manager associated with work order
  dispatcherId: varchar("dispatcher_id").references(() => users.id), // Dispatcher associated with work order
  fieldAgentId: varchar("field_agent_id").references(() => users.id), // Field agent who completed work
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service company ratings for clients (3 categories: Communication, Requirements Clarity, Payment Promptness)
export const serviceClientRatings = pgTable("service_client_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  raterId: varchar("rater_id").notNull().references(() => users.id), // Service company user giving rating
  clientId: varchar("client_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  // Rating categories (1-5 stars each)
  communicationRating: integer("communication_rating").notNull(), // How well client communicated
  requirementsClarityRating: integer("requirements_clarity_rating").notNull(), // How clear client's requirements were
  paymentRating: integer("payment_rating").notNull(), // Payment promptness and reliability
  // Optional feedback for each category
  communicationFeedback: text("communication_feedback"),
  requirementsFeedback: text("requirements_feedback"),
  paymentFeedback: text("payment_feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assignedWorkOrders: many(workOrders, { relationName: "assigneeWorkOrders" }),
  createdWorkOrders: many(workOrders, { relationName: "creatorWorkOrders" }),
  budgetCreatedWorkOrders: many(workOrders, { relationName: "budgetCreatorWorkOrders" }),
  timeEntries: many(timeEntries),
  sentMessages: many(messages, { relationName: "senderMessages" }),
  receivedMessages: many(messages, { relationName: "recipientMessages" }),
  notifications: many(notifications),
}));

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  assignee: one(users, {
    fields: [workOrders.assigneeId],
    references: [users.id],
    relationName: "assigneeWorkOrders",
  }),
  createdBy: one(users, {
    fields: [workOrders.createdById],
    references: [users.id],
    relationName: "creatorWorkOrders",
  }),
  budgetCreatedBy: one(users, {
    fields: [workOrders.budgetCreatedById],
    references: [users.id],
    relationName: "budgetCreatorWorkOrders",
  }),
  timeEntries: many(timeEntries),
  messages: many(messages),
  tasks: many(workOrderTasks),
  issues: many(workOrderIssues),
  notifications: many(notifications),
  clientServiceRatings: many(clientServiceRatings),
  serviceClientRatings: many(serviceClientRatings),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  workOrder: one(workOrders, {
    fields: [timeEntries.workOrderId],
    references: [workOrders.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "senderMessages",
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: "recipientMessages",
  }),
  workOrder: one(workOrders, {
    fields: [messages.workOrderId],
    references: [workOrders.id],
  }),
}));

export const workOrderTasksRelations = relations(workOrderTasks, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [workOrderTasks.workOrderId],
    references: [workOrders.id],
  }),
  completedBy: one(users, {
    fields: [workOrderTasks.completedById],
    references: [users.id],
  }),
}));

export const workOrderIssuesRelations = relations(workOrderIssues, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [workOrderIssues.workOrderId],
    references: [workOrders.id],
  }),
  createdBy: one(users, {
    fields: [workOrderIssues.createdById],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  workOrder: one(workOrders, {
    fields: [notifications.workOrderId],
    references: [workOrders.id],
  }),
}));

export const clientServiceRatingsRelations = relations(clientServiceRatings, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [clientServiceRatings.workOrderId],
    references: [workOrders.id],
  }),
  client: one(users, {
    fields: [clientServiceRatings.clientId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [clientServiceRatings.companyId],
    references: [companies.id],
  }),
  manager: one(users, {
    fields: [clientServiceRatings.managerId],
    references: [users.id],
  }),
  dispatcher: one(users, {
    fields: [clientServiceRatings.dispatcherId],
    references: [users.id],
  }),
  fieldAgent: one(users, {
    fields: [clientServiceRatings.fieldAgentId],
    references: [users.id],
  }),
}));

export const serviceClientRatingsRelations = relations(serviceClientRatings, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [serviceClientRatings.workOrderId],
    references: [workOrders.id],
  }),
  rater: one(users, {
    fields: [serviceClientRatings.raterId],
    references: [users.id],
  }),
  client: one(users, {
    fields: [serviceClientRatings.clientId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [serviceClientRatings.companyId],
    references: [companies.id],
  }),
}));

// Role validation schema
export const rolesSchema = z.array(z.enum(['operations_director', 'administrator', 'manager', 'dispatcher', 'field_agent', 'client'])).min(1);

// Schemas
export const insertUserSchema = createInsertSchema(users, {
  roles: rolesSchema,
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  actualHours: true,
  completedAt: true,
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export const insertWorkOrderTaskSchema = createInsertSchema(workOrderTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertWorkOrderIssueSchema = createInsertSchema(workOrderIssues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
});

export const insertIssueSchema = createInsertSchema(issues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  confirmedAt: true,
});

export const insertClientServiceRatingSchema = createInsertSchema(clientServiceRatings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceClientRatingSchema = createInsertSchema(serviceClientRatings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type WorkOrderTask = typeof workOrderTasks.$inferSelect;
export type InsertWorkOrderTask = z.infer<typeof insertWorkOrderTaskSchema>;

export type WorkOrderIssue = typeof workOrderIssues.$inferSelect;
export type InsertWorkOrderIssue = z.infer<typeof insertWorkOrderIssueSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type ClientServiceRating = typeof clientServiceRatings.$inferSelect;
export type InsertClientServiceRating = z.infer<typeof insertClientServiceRatingSchema>;

export type ServiceClientRating = typeof serviceClientRatings.$inferSelect;
export type InsertServiceClientRating = z.infer<typeof insertServiceClientRatingSchema>;

export type Issue = typeof issues.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;

// Role utility functions
export function hasRole(user: User | null, role: string): boolean {
  if (!user || !user.roles) return false;
  return user.roles.includes(role);
}

export function hasAnyRole(user: User | null, roles: string[]): boolean {
  if (!user || !user.roles) return false;
  return roles.some(role => user.roles.includes(role));
}

export function isAdmin(user: User | null): boolean {
  return hasRole(user, 'administrator');
}

export function isManager(user: User | null): boolean {
  return hasRole(user, 'manager');
}

export function isFieldAgent(user: User | null): boolean {
  return hasRole(user, 'field_agent');
}

export function isClient(user: User | null): boolean {
  return hasRole(user, 'client');
}

export function canViewJobNetwork(user: User | null): boolean {
  return hasAnyRole(user, ['administrator', 'manager', 'dispatcher', 'client']);
}

export function canRequestWorkOrder(user: User | null): boolean {
  return hasAnyRole(user, ['administrator', 'manager', 'dispatcher']);
}

export function isOperationsDirector(user: User | null): boolean {
  return hasRole(user, 'operations_director');
}

export function canManageUsers(user: User | null): boolean {
  return hasAnyRole(user, ['administrator', 'manager']);
}

export function canManageWorkOrders(user: User | null): boolean {
  return hasAnyRole(user, ['administrator', 'manager', 'dispatcher']);
}

export function canViewBudgets(user: User | null): boolean {
  return hasAnyRole(user, ['administrator', 'manager']);
}

export function canViewAllOrders(user: User | null): boolean {
  return hasAnyRole(user, ['administrator', 'manager', 'dispatcher']);
}

export function canOnboardAdmins(user: User | null): boolean {
  return hasRole(user, 'operations_director');
}

export function canManageCompanies(user: User | null): boolean {
  return hasRole(user, 'operations_director');
}

export function getPrimaryRole(user: User | null): string {
  if (!user || !user.roles || user.roles.length === 0) return 'field_agent';
  
  // Priority order: operations_director > administrator > manager > dispatcher > field_agent > client
  if (user.roles.includes('operations_director')) return 'operations_director';
  if (user.roles.includes('administrator')) return 'administrator';
  if (user.roles.includes('manager')) return 'manager';
  if (user.roles.includes('dispatcher')) return 'dispatcher';
  if (user.roles.includes('field_agent')) return 'field_agent';
  if (user.roles.includes('client')) return 'client';
  return 'field_agent';
}
