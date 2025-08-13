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
  type: varchar("type").notNull().default("service"), // "service" or "client"
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  phone: varchar("phone"),
  email: varchar("email"),
  website: varchar("website"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  // Company rating system
  overallRating: decimal("overall_rating", { precision: 3, scale: 2 }).default("0.00"), // average of all user ratings
  totalRatings: integer("total_ratings").default(0), // total number of ratings received
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
  roles: text("roles").array().notNull().default(sql`ARRAY['field_agent']`), // array of: operations_director, administrator, project_manager, manager, dispatcher, field_engineer, field_agent
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
  // Rating system fields
  overallRating: decimal("overall_rating", { precision: 3, scale: 2 }).default("0.00"), // average of all ratings received
  totalRatings: integer("total_ratings").default(0), // total number of ratings received
  // Field Agent specific ratings
  communicationRating: decimal("communication_rating", { precision: 3, scale: 2 }).default("0.00"),
  timelinessRating: decimal("timeliness_rating", { precision: 3, scale: 2 }).default("0.00"), 
  workSatisfactionRating: decimal("work_satisfaction_rating", { precision: 3, scale: 2 }).default("0.00"),
  // Dispatcher specific ratings  
  managementRating: decimal("management_rating", { precision: 3, scale: 2 }).default("0.00"),
  fieldAgentRating: decimal("field_agent_rating", { precision: 3, scale: 2 }).default("0.00"),
  // Client specific ratings
  clearScopeRating: decimal("clear_scope_rating", { precision: 3, scale: 2 }).default("0.00"),
  overallSatisfactionRating: decimal("overall_satisfaction_rating", { precision: 3, scale: 2 }).default("0.00"),
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
  // Assignment progress tracking
  assignmentProgress: varchar("assignment_progress").default(""), // tracks status for client approval
  pathToCompletion: varchar("path_to_completion").default(""), // current path status
  progressIndicator: varchar("progress_indicator").default(""), // visual indicator status
  assignmentProgressStatus: varchar("assignment_progress_status").default("confirm"), // confirm, in_route, check_in, check_out, mark_complete, mark_incomplete
  // Scheduling status
  isScheduled: boolean("is_scheduled").default(false), // true when field agent puts work order on schedule
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

// Client ratings for Field Agents (3-tier: Communication, Timeliness, Work Satisfaction)
export const clientFieldAgentRatings = pgTable("client_field_agent_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  fieldAgentId: varchar("field_agent_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  // 3-tier rating system (0-5 stars each)
  communicationRating: integer("communication_rating").notNull(),
  timelinessRating: integer("timeliness_rating").notNull(),
  workSatisfactionRating: integer("work_satisfaction_rating").notNull(),
  // Optional feedback for each tier
  communicationFeedback: text("communication_feedback"),
  timelinessFeedback: text("timeliness_feedback"),
  workSatisfactionFeedback: text("work_satisfaction_feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client ratings for Dispatchers (3-tier: Communication, Management, Field Agent)
export const clientDispatcherRatings = pgTable("client_dispatcher_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  dispatcherId: varchar("dispatcher_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  // 3-tier rating system (0-5 stars each)  
  communicationRating: integer("communication_rating").notNull(),
  managementRating: integer("management_rating").notNull(),
  fieldAgentRating: integer("field_agent_rating").notNull(),
  // Optional feedback for each tier
  communicationFeedback: text("communication_feedback"),
  managementFeedback: text("management_feedback"),
  fieldAgentFeedback: text("field_agent_feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service company ratings for clients (3-tier: Clear/Correct Scope, Communication, Overall Satisfaction)
export const serviceClientRatings = pgTable("service_client_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  raterId: varchar("rater_id").notNull().references(() => users.id), // Dispatcher or Field Agent giving rating
  clientId: varchar("client_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  // 3-tier rating system (0-5 stars each)
  clearScopeRating: integer("clear_scope_rating").notNull(), // Clear/Correct Scope
  communicationRating: integer("communication_rating").notNull(), // Communication
  overallSatisfactionRating: integer("overall_satisfaction_rating").notNull(), // Overall Satisfaction
  // Optional feedback for each tier
  clearScopeFeedback: text("clear_scope_feedback"),
  communicationFeedback: text("communication_feedback"),
  overallSatisfactionFeedback: text("overall_satisfaction_feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Job Network - Public work order postings visible to all Admin Teams
export const jobNetworkPosts = pgTable("job_network_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  budget: decimal("budget"),
  budgetType: varchar("budget_type"), // fixed, hourly, per_device, materials_labor
  priority: varchar("priority").default("normal"), // normal, high, urgent
  requiredSkills: text("required_skills").array(),
  estimatedDuration: varchar("estimated_duration"),
  scheduledDate: timestamp("scheduled_date"),
  status: varchar("status").default("open"), // open, assigned, in_progress, completed, cancelled
  // Posting company info
  clientCompanyId: varchar("client_company_id").notNull().references(() => companies.id),
  postedById: varchar("posted_by_id").notNull().references(() => users.id),
  // Assignment info
  assignedToCompanyId: varchar("assigned_to_company_id").references(() => companies.id),
  assignedById: varchar("assigned_by_id").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  // Direct routing option
  routedToCompanyId: varchar("routed_to_company_id").references(() => companies.id), // For direct routing to specific service company
  isPublic: boolean("is_public").default(true), // false for routed jobs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Exclusive Network - Private work order postings for Admin Teams only
export const exclusiveNetworkPosts = pgTable("exclusive_network_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  budget: decimal("budget"),
  budgetType: varchar("budget_type"), // fixed, hourly, per_device, materials_labor
  priority: varchar("priority").default("normal"), // normal, high, urgent
  requiredSkills: text("required_skills").array(),
  estimatedDuration: varchar("estimated_duration"),
  scheduledDate: timestamp("scheduled_date"),
  status: varchar("status").default("open"), // open, assigned, in_progress, completed, cancelled
  // Posting company info
  clientCompanyId: varchar("client_company_id").notNull().references(() => companies.id),
  postedById: varchar("posted_by_id").notNull().references(() => users.id),
  // Assignment info
  assignedToCompanyId: varchar("assigned_to_company_id").references(() => companies.id),
  assignedById: varchar("assigned_by_id").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  // Access control - only visible to Admin Teams
  visibleToAdminTeamsOnly: boolean("visible_to_admin_teams_only").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work Order Requests - For tracking requests from service companies to clients
export const workOrderRequests = pgTable("work_order_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobNetworkPostId: varchar("job_network_post_id").references(() => jobNetworkPosts.id),
  exclusiveNetworkPostId: varchar("exclusive_network_post_id").references(() => exclusiveNetworkPosts.id),
  // Requesting service company info
  requestingCompanyId: varchar("requesting_company_id").notNull().references(() => companies.id),
  requestedById: varchar("requested_by_id").notNull().references(() => users.id), // Admin team member who made request
  // Client company info
  clientCompanyId: varchar("client_company_id").notNull().references(() => companies.id),
  // Request details
  message: text("message"), // Optional message from requesting company
  proposedAgentId: varchar("proposed_agent_id").references(() => users.id), // Field agent they propose to assign
  status: varchar("status").notNull().default("pending"), // pending, approved, declined, assigned
  // Response from client
  reviewedById: varchar("reviewed_by_id").references(() => users.id), // Client admin who reviewed
  reviewedAt: timestamp("reviewed_at"),
  clientResponse: text("client_response"),
  // Work order creation when approved
  workOrderId: varchar("work_order_id").references(() => workOrders.id), // Created work order if approved
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Exclusive Network Members - Tracks which service companies clients have added to their exclusive network
export const exclusiveNetworkMembers = pgTable("exclusive_network_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientCompanyId: varchar("client_company_id").notNull().references(() => companies.id),
  serviceCompanyId: varchar("service_company_id").notNull().references(() => companies.id),
  // Tracking completion criteria
  completedWorkOrders: integer("completed_work_orders").default(0), // Count of completed work orders 
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0.00"), // Average rating from completed work orders
  qualifiesForExclusive: boolean("qualifies_for_exclusive").default(false), // True when 5+ work orders with 4+ stars
  // Status tracking
  isActive: boolean("is_active").default(true), // Client can activate/deactivate
  addedAt: timestamp("added_at").defaultNow(),
  lastWorkOrderAt: timestamp("last_work_order_at"), // Last completed work order timestamp
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Access Requests table - for unregistered users requesting system access
export const accessRequests = pgTable("access_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  requestedRole: varchar("requested_role").notNull(), // field_agent, manager, project_manager, administrator
  intention: varchar("intention").notNull(), // do_jobs, create_jobs, manage_jobs_people
  howHeardAbout: text("how_heard_about"),
  skillsDescription: text("skills_description"),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected
  requestedAt: timestamp("requested_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  notes: text("notes"), // admin notes during review
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  projectCode: varchar("project_code").unique().notNull(), // e.g., "dowa1234"
  description: text("description"),
  overview: text("overview"),
  startDate: timestamp("start_date").notNull(),
  expectedDuration: integer("expected_duration").notNull(), // in days
  endDate: timestamp("end_date"), // calculated or set based on duration
  budget: decimal("budget", { precision: 10, scale: 2 }),
  workersNeeded: integer("workers_needed").notNull(),
  status: varchar("status").notNull().default("available"), // available, assigned, in_progress, completed, cancelled
  createdById: varchar("created_by_id").notNull().references(() => users.id), // project manager who created it
  createdByCompanyId: varchar("created_by_company_id").notNull().references(() => companies.id),
  assignedToCompanyId: varchar("assigned_to_company_id").references(() => companies.id), // company that accepted the project
  assignedAt: timestamp("assigned_at"),
  assignedById: varchar("assigned_by_id").references(() => users.id), // admin who assigned it
  tools: text("tools").array(), // required tools
  requirements: text("requirements").array(), // project requirements
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project requirements table (for more structured requirements)
export const projectRequirements = pgTable("project_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  requirement: text("requirement").notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedBy: varchar("completed_by").references(() => users.id),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project assignments table (tracks which users are assigned to projects)
export const projectAssignments = pgTable("project_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role").notNull(), // field_agent, field_engineer, project_manager, manager, etc.
  assignedById: varchar("assigned_by_id").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  status: varchar("status").default("active"), // active, completed, removed
});

// Approval requests table (for onboarding requests within projects)
export const approvalRequests = pgTable("approval_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(), // "user_onboarding", "project_assignment", etc.
  requestedById: varchar("requested_by_id").notNull().references(() => users.id),
  reviewerId: varchar("reviewer_id").references(() => users.id), // admin who needs to approve
  projectId: varchar("project_id").references(() => projects.id),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected
  requestData: jsonb("request_data"), // stores form data for user creation, etc.
  notes: text("notes"),
  reviewedAt: timestamp("reviewed_at"),
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
  clientFieldAgentRatings: many(clientFieldAgentRatings),
  clientDispatcherRatings: many(clientDispatcherRatings),
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

export const clientFieldAgentRatingsRelations = relations(clientFieldAgentRatings, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [clientFieldAgentRatings.workOrderId],
    references: [workOrders.id],
  }),
  client: one(users, {
    fields: [clientFieldAgentRatings.clientId],
    references: [users.id],
  }),
  fieldAgent: one(users, {
    fields: [clientFieldAgentRatings.fieldAgentId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [clientFieldAgentRatings.companyId],
    references: [companies.id],
  }),
}));

export const clientDispatcherRatingsRelations = relations(clientDispatcherRatings, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [clientDispatcherRatings.workOrderId],
    references: [workOrders.id],
  }),
  client: one(users, {
    fields: [clientDispatcherRatings.clientId],
    references: [users.id],
  }),
  dispatcher: one(users, {
    fields: [clientDispatcherRatings.dispatcherId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [clientDispatcherRatings.companyId],
    references: [companies.id],
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

export const insertClientFieldAgentRatingSchema = createInsertSchema(clientFieldAgentRatings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientDispatcherRatingSchema = createInsertSchema(clientDispatcherRatings).omit({
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

export const insertJobNetworkPostSchema = createInsertSchema(jobNetworkPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assignedAt: true,
});

export const insertExclusiveNetworkPostSchema = createInsertSchema(exclusiveNetworkPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assignedAt: true,
});

export const insertWorkOrderRequestSchema = createInsertSchema(workOrderRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
});

export const insertExclusiveNetworkMemberSchema = createInsertSchema(exclusiveNetworkMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  addedAt: true,
});

// Project schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assignedAt: true,
  assignedById: true,
  assignedToCompanyId: true,
});

export const insertProjectRequirementSchema = createInsertSchema(projectRequirements).omit({
  id: true,
  createdAt: true,
  completedBy: true,
  completedAt: true,
  isCompleted: true,
});

export const insertProjectAssignmentSchema = createInsertSchema(projectAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  reviewerId: true,
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

export type ClientFieldAgentRating = typeof clientFieldAgentRatings.$inferSelect;
export type InsertClientFieldAgentRating = z.infer<typeof insertClientFieldAgentRatingSchema>;

export type ClientDispatcherRating = typeof clientDispatcherRatings.$inferSelect;
export type InsertClientDispatcherRating = z.infer<typeof insertClientDispatcherRatingSchema>;

export type ServiceClientRating = typeof serviceClientRatings.$inferSelect;
export type InsertServiceClientRating = z.infer<typeof insertServiceClientRatingSchema>;

export type Issue = typeof issues.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;

export type JobNetworkPost = typeof jobNetworkPosts.$inferSelect;
export type InsertJobNetworkPost = z.infer<typeof insertJobNetworkPostSchema>;

export type ExclusiveNetworkPost = typeof exclusiveNetworkPosts.$inferSelect;
export type InsertExclusiveNetworkPost = z.infer<typeof insertExclusiveNetworkPostSchema>;

export type WorkOrderRequest = typeof workOrderRequests.$inferSelect;
export type InsertWorkOrderRequest = z.infer<typeof insertWorkOrderRequestSchema>;

export type ExclusiveNetworkMember = typeof exclusiveNetworkMembers.$inferSelect;
export type InsertExclusiveNetworkMember = z.infer<typeof insertExclusiveNetworkMemberSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectRequirement = typeof projectRequirements.$inferSelect;
export type InsertProjectRequirement = z.infer<typeof insertProjectRequirementSchema>;

export type ProjectAssignment = typeof projectAssignments.$inferSelect;
export type InsertProjectAssignment = z.infer<typeof insertProjectAssignmentSchema>;

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;

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
  
  // Priority order: operations_director > administrator > project_manager > manager > dispatcher > field_engineer > field_agent
  if (user.roles.includes('operations_director')) return 'operations_director';
  if (user.roles.includes('administrator')) return 'administrator';
  if (user.roles.includes('project_manager')) return 'project_manager';
  if (user.roles.includes('manager')) return 'manager';
  if (user.roles.includes('dispatcher')) return 'dispatcher';
  if (user.roles.includes('field_engineer')) return 'field_engineer';
  if (user.roles.includes('field_agent')) return 'field_agent';
  return 'field_agent';
}

// Admin Team and Chief Team utility functions
export function isAdminTeam(user: User | null): boolean {
  return hasAnyRole(user, ['administrator', 'project_manager', 'manager', 'field_engineer']);
}

export function isChiefTeam(user: User | null): boolean {
  return hasAnyRole(user, ['administrator', 'project_manager']);
}

export function canViewBudgetsFieldEngineer(user: User | null): boolean {
  return hasAnyRole(user, ['administrator', 'project_manager', 'manager', 'field_engineer']);
}

export function canCreateProjects(user: User | null): boolean {
  return isOperationsDirector(user) || hasRole(user, 'project_manager');
}

export function canEditProjects(user: User | null): boolean {
  return isOperationsDirector(user) || hasRole(user, 'project_manager');
}

export function canDeleteProjects(user: User | null): boolean {
  return isOperationsDirector(user) || hasRole(user, 'project_manager');
}

export function canAssignProjects(user: User | null): boolean {
  return isOperationsDirector(user) || hasRole(user, 'project_manager');
}

export function canViewProjectNetwork(user: User | null): boolean {
  return isAdminTeam(user);
}

export function canPostToJobNetwork(user: User | null): boolean {
  return isAdminTeam(user) || isClient(user);
}

export function canViewExclusiveNetwork(user: User | null): boolean {
  return isAdminTeam(user);
}

export function canAssignWorkOrders(user: User | null): boolean {
  return isAdminTeam(user);
}

// Access Request types
export type AccessRequest = typeof accessRequests.$inferSelect;
export type InsertAccessRequest = typeof accessRequests.$inferInsert;

export const insertAccessRequestSchema = createInsertSchema(accessRequests).omit({
  id: true,
  requestedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  status: true,
  notes: true,
});

export type InsertAccessRequestType = z.infer<typeof insertAccessRequestSchema>;
