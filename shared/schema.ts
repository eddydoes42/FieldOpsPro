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
  date,
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

// Exclusive Networks - client-service company relationships
export const exclusiveNetworks = pgTable("exclusive_networks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientCompanyId: varchar("client_company_id").notNull().references(() => companies.id),
  serviceCompanyId: varchar("service_company_id").notNull().references(() => companies.id),
  addedById: varchar("added_by_id").references(() => users.id), // client admin who added the relationship
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
  // Job Visibility Logic fields for field agents
  agentLocation: text("agent_location"), // field agent's location/address
  agentLatitude: decimal("agent_latitude", { precision: 10, scale: 8 }),
  agentLongitude: decimal("agent_longitude", { precision: 11, scale: 8 }),
  skills: text("skills").array().default(sql`ARRAY[]::TEXT[]`), // field agent skills/certifications
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
  category: varchar("category"), // Module 11: for profitability analysis - network_installation, maintenance, troubleshooting, upgrade, etc.
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
  // Client final approval and profit calculation fields
  clientApprovalStatus: varchar("client_approval_status").default("pending"), // pending, approved, rejected, requires_revision
  clientApprovedById: varchar("client_approved_by_id").references(() => users.id),
  clientApprovedAt: timestamp("client_approved_at"),
  clientApprovalNotes: text("client_approval_notes"),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }), // percentage profit margin
  actualProfit: decimal("actual_profit", { precision: 10, scale: 2 }), // calculated profit amount
  profitCalculatedAt: timestamp("profit_calculated_at"),
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
  // Job Visibility Logic fields
  jobLocation: text("job_location"), // address for the job
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  requiredSkills: text("required_skills").array().default(sql`ARRAY[]::TEXT[]`),
  visibilityScope: varchar("visibility_scope").default("public"), // "public" or "exclusive"
  // Documents Required field
  documentsRequired: integer("documents_required").default(0), // number of documents required to be uploaded
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

// Job-specific threaded messages table
export const jobMessages = pgTable("job_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  attachments: text("attachments").array().default(sql`ARRAY[]::text[]`), // array of file URLs/paths
  isImportant: boolean("is_important").default(false), // pinned/flagged messages
  isPinned: boolean("is_pinned").default(false), // pinned to top of thread
  mentionedUserIds: text("mentioned_user_ids").array().default(sql`ARRAY[]::text[]`), // @mentions
  sentAt: timestamp("sent_at").defaultNow(),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Work Order Tools table
export const workOrderTools = pgTable("work_order_tools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // hardware, software, safety, testing, other
  isRequired: boolean("is_required").default(true),
  isAvailable: boolean("is_available").default(false), // whether agent has confirmed they have this tool
  confirmedById: varchar("confirmed_by_id").references(() => users.id),
  confirmedAt: timestamp("confirmed_at"),
  orderIndex: integer("order_index").default(0), // for ordering tools
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced Documents table for projects, work orders, and tasks
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Flexible linking to different entities
  entityType: varchar("entity_type").notNull(), // 'project', 'work_order', 'task'
  entityId: varchar("entity_id").notNull(), // ID of the linked entity
  filename: varchar("filename").notNull(),
  originalFilename: varchar("original_filename").notNull(),
  fileUrl: varchar("file_url").notNull(), // Object storage URL
  mimeType: varchar("mime_type").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  category: varchar("category").notNull(), // 'pre_visit', 'during_visit', 'post_visit'
  description: text("description"),
  uploadedById: varchar("uploaded_by_id").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  isRequired: boolean("is_required").default(false),
  isCompleted: boolean("is_completed").default(false), // for forms/checklists
  completedById: varchar("completed_by_id").references(() => users.id),
  completedAt: timestamp("completed_at"),
  orderIndex: integer("order_index").default(0),
  // Metadata for additional context
  metadata: jsonb("metadata"), // Additional file metadata as JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work Order Documents table (legacy - keeping for compatibility)
export const workOrderDocuments = pgTable("work_order_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // reference, procedure, checklist, form, other
  fileUrl: varchar("file_url"), // URL to uploaded document
  isRequired: boolean("is_required").default(true),
  isCompleted: boolean("is_completed").default(false), // for forms/checklists that need completion
  completedById: varchar("completed_by_id").references(() => users.id),
  completedAt: timestamp("completed_at"),
  orderIndex: integer("order_index").default(0), // for ordering documents
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

// Structured Issues table for enhanced issue reporting tied to work orders
export const structuredIssues = pgTable("structured_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // hazard, delay, equipment, other
  description: text("description").notNull(),
  severity: varchar("severity").notNull().default("low"), // low, medium, high
  status: varchar("status").notNull().default("open"), // open, resolved, escalated
  attachments: text("attachments").array().default(sql`ARRAY[]::text[]`), // array of file URLs
  reviewedById: varchar("reviewed_by_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  resolution: text("resolution"), // resolution notes when closed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit Logs for tracking all system actions
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type").notNull(), // work_order, issue, user_action, approval, assignment, project
  entityId: varchar("entity_id").notNull(), // ID of the affected entity
  action: varchar("action").notNull(), // created, updated, assigned, resolved, escalated, approved, rejected, deleted, restored
  performedBy: varchar("performed_by").notNull().references(() => users.id),
  previousState: text("previous_state"), // JSON string of previous values
  newState: text("new_state"), // JSON string of new values
  reason: text("reason"), // Optional reason for the action
  metadata: text("metadata"), // Additional context as JSON (e.g., IP address, user agent, etc.)
  timestamp: timestamp("timestamp").defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  givenBy: varchar("given_by").notNull().references(() => users.id),
  givenTo: varchar("given_to").notNull().references(() => users.id),
  stars: integer("stars").notNull(),
  categoryScores: jsonb("category_scores"),
  comments: text("comments"),
  wouldHireAgain: boolean("would_hire_again"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Performance snapshots for historical tracking and analytics
export const performanceSnapshots = pgTable("performance_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  metrics: jsonb("metrics").notNull(), // JSON object containing all performance metrics
  createdAt: timestamp("created_at").defaultNow(),
});

// Service quality snapshots for company-level dashboard insights
export const serviceQualitySnapshots = pgTable("service_quality_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  metrics: jsonb("metrics").notNull(), // JSON object containing all service quality metrics
  createdAt: timestamp("created_at").defaultNow(),
});

// Risk Scores table for predictive risk analysis
export const riskScores = pgTable("risk_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type").notNull(), // 'agent' or 'company'
  entityId: varchar("entity_id").notNull(),
  score: integer("score").notNull(), // 0-100 risk score
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  flaggedMetrics: jsonb("flagged_metrics").notNull(), // JSON object with flagged metrics and thresholds
  createdAt: timestamp("created_at").defaultNow(),
});

// Risk Interventions table for tracking follow-up actions
export const riskInterventions = pgTable("risk_interventions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riskId: varchar("risk_id").notNull().references(() => riskScores.id),
  action: text("action").notNull(), // Description of intervention action
  assignedTo: varchar("assigned_to").references(() => users.id), // User assigned to handle intervention
  status: varchar("status").notNull().default("open"), // 'open', 'in_progress', 'closed'
  notes: text("notes"), // Additional notes or follow-up information
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"), // When intervention was completed
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

// Job Network - Public work order postings visible to all Admin Teams (M1 - Job Request System)
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
  // Enhanced job request fields
  urgencyLevel: varchar("urgency_level").default("normal"), // low, normal, high, critical
  contractorRequirements: jsonb("contractor_requirements"), // Specific requirements for contractors
  estimatedStartDate: timestamp("estimated_start_date"),
  estimatedEndDate: timestamp("estimated_end_date"),
  serviceCategory: varchar("service_category"), // network_install, maintenance, troubleshooting, etc.
  equipmentProvided: boolean("equipment_provided").default(false),
  accessInstructions: text("access_instructions"),
  specialRequirements: text("special_requirements"),
  approvalRequired: boolean("approval_required").default(false),
  maxBudget: decimal("max_budget"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// M2 - Contractor Onboarding Flow
export const contractorOnboarding = pgTable("contractor_onboarding", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  onboardingStage: varchar("onboarding_stage").notNull().default("application"), // application, documentation, skills_assessment, background_check, approval, completed
  applicationData: jsonb("application_data"), // JSON with application form data
  documentsSubmitted: jsonb("documents_submitted"), // Array of document references
  skillsAssessmentScore: integer("skills_assessment_score"),
  backgroundCheckStatus: varchar("background_check_status"), // pending, clear, issues, failed
  backgroundCheckData: jsonb("background_check_data"),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvalNotes: text("approval_notes"),
  rejectionReason: text("rejection_reason"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"), // For time-limited approvals
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// M4 - Role-Aware Messaging Hub
export const messagingChannels = pgTable("messaging_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  channelType: varchar("channel_type").notNull(), // company_wide, project_specific, role_based, direct
  companyId: varchar("company_id").references(() => companies.id),
  workOrderId: varchar("work_order_id").references(() => workOrders.id),
  projectId: varchar("project_id").references(() => projects.id),
  allowedRoles: text("allowed_roles").array(), // Array of roles that can access this channel
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  isArchived: boolean("is_archived").default(false),
  lastActivityAt: timestamp("last_activity_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const channelMessages = pgTable("channel_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull().references(() => messagingChannels.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  messageType: varchar("message_type").default("text"), // text, file, system, alert
  attachments: text("attachments").array().default(sql`ARRAY[]::text[]`),
  mentions: text("mentions").array().default(sql`ARRAY[]::text[]`), // User IDs mentioned in message
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  replyToId: varchar("reply_to_id").references(() => channelMessages.id), // For threaded conversations
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  isSystemMessage: boolean("is_system_message").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});



// M11 - Job Category Profitability Analysis
export const jobCategoryMetrics = pgTable("job_category_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  category: varchar("category").notNull(), // network_installation, maintenance, troubleshooting, etc.
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  totalJobs: integer("total_jobs").notNull().default(0),
  completedJobs: integer("completed_jobs").notNull().default(0),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0.00"),
  totalCosts: decimal("total_costs", { precision: 12, scale: 2 }).default("0.00"),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }).default("0.00"),
  averageJobValue: decimal("average_job_value", { precision: 10, scale: 2 }).default("0.00"),
  averageCompletionTime: decimal("average_completion_time", { precision: 8, scale: 2 }).default("0.00"), // in hours
  customerSatisfactionScore: decimal("customer_satisfaction_score", { precision: 3, scale: 2 }).default("0.00"),
  repeatCustomerRate: decimal("repeat_customer_rate", { precision: 5, scale: 2 }).default("0.00"),
  issueRate: decimal("issue_rate", { precision: 5, scale: 2 }).default("0.00"), // percentage of jobs with issues
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// M14 - Bid & Proposal System
export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobNetworkPostId: varchar("job_network_post_id").notNull().references(() => jobNetworkPosts.id),
  serviceCompanyId: varchar("service_company_id").notNull().references(() => companies.id),
  submittedById: varchar("submitted_by_id").notNull().references(() => users.id),
  proposalTitle: varchar("proposal_title").notNull(),
  proposalDescription: text("proposal_description").notNull(),
  proposedBudget: decimal("proposed_budget", { precision: 12, scale: 2 }).notNull(),
  estimatedStartDate: timestamp("estimated_start_date"),
  estimatedEndDate: timestamp("estimated_end_date"),
  proposedTeam: jsonb("proposed_team"), // Array of team member objects
  methodology: text("methodology"), // How the work will be performed
  timeline: jsonb("timeline"), // Detailed timeline with milestones
  assumptions: text("assumptions"), // Any assumptions made in the proposal
  riskMitigation: text("risk_mitigation"), // Risk assessment and mitigation strategies
  qualifications: text("qualifications"), // Company and team qualifications
  portfolioItems: jsonb("portfolio_items"), // Relevant past work examples
  status: varchar("status").default("submitted"), // submitted, under_review, shortlisted, accepted, rejected, withdrawn
  reviewedById: varchar("reviewed_by_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  isWinning: boolean("is_winning").default(false), // True if this proposal won the bid
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

// Job Requests - For Field Agents to request assignment to work orders
export const jobRequests = pgTable("job_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  status: varchar("status").notNull().default("requested"), // requested, approved, rejected
  message: text("message"), // Optional message from field agent
  requestedAt: timestamp("requested_at").defaultNow(),
  reviewedBy: varchar("reviewed_by").references(() => users.id), // Admin who reviewed
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"), // Optional reason for rejection
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
  // Documents Required field
  documentsRequired: integer("documents_required").default(0), // number of documents required to be uploaded
  // Budget deduction workflow fields
  budgetStatus: varchar("budget_status").notNull().default("pending"), // pending, approved, deducted, cancelled
  budgetApprovedById: varchar("budget_approved_by_id").references(() => users.id),
  budgetApprovedAt: timestamp("budget_approved_at"),
  budgetDeductedAt: timestamp("budget_deducted_at"),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }), // final cost after completion
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bids table (Module 14: Bid & Proposal System)
export const bids = pgTable("bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  userId: varchar("user_id").notNull().references(() => users.id), // field agent submitting bid
  bidAmount: decimal("bid_amount", { precision: 10, scale: 2 }).notNull(),
  proposedStartDate: timestamp("proposed_start_date"),
  estimatedCompletionHours: decimal("estimated_completion_hours", { precision: 5, scale: 2 }),
  proposal: text("proposal"), // detailed proposal text
  status: varchar("status").notNull().default("pending"), // pending, accepted, rejected, withdrawn
  notes: text("notes"), // admin notes on decision
  acceptedAt: timestamp("accepted_at"),
  acceptedById: varchar("accepted_by_id").references(() => users.id), // admin who accepted
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credentials table (Module 15: Credential & Compliance Vault)
export const credentials = pgTable("credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  credentialType: varchar("credential_type").notNull(), // certification, license, training, insurance
  name: varchar("name").notNull(), // e.g. "CompTIA Network+", "Electrical License"
  issuingOrganization: varchar("issuing_organization"), // e.g. "CompTIA", "State Board"
  credentialNumber: varchar("credential_number"), // license/cert number
  fileUrl: varchar("file_url"), // uploaded document
  issuedAt: timestamp("issued_at"),
  expiresAt: timestamp("expires_at"),
  status: varchar("status").notNull().default("active"), // active, expired, suspended, revoked
  isVerified: boolean("is_verified").default(false), // admin verification
  verifiedById: varchar("verified_by_id").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  renewalReminderSent: boolean("renewal_reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recognition table (Module 16: Incentive & Recognition Engine)
export const recognition = pgTable("recognition", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // badge, points, achievement
  category: varchar("category").notNull(), // excellence, timeliness, customer_satisfaction, compliance
  title: varchar("title").notNull(), // "5-Star Professional", "On-Time Champion"
  description: text("description"),
  points: integer("points").default(0), // points awarded
  iconUrl: varchar("icon_url"), // badge icon
  awardedById: varchar("awarded_by_id").references(() => users.id), // who awarded it
  awardedAt: timestamp("awarded_at").defaultNow(),
  isVisible: boolean("is_visible").default(true), // show on profile
  metadata: jsonb("metadata"), // additional award context
});

// Module 12: Enhanced Work Order Search & Filters
export const workOrderFilters = pgTable("work_order_filters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  skillTags: jsonb("skill_tags"), // array of required skills
  locationRadius: integer("location_radius"), // search radius in miles
  minPayRate: decimal("min_pay_rate", { precision: 10, scale: 2 }),
  maxPayRate: decimal("max_pay_rate", { precision: 10, scale: 2 }),
  urgencyLevel: varchar("urgency_level"), // standard, urgent, emergency
  experienceRequired: varchar("experience_required"), // entry, mid, senior
  certificationRequired: jsonb("certification_required"), // array of required certifications
  equipmentProvided: boolean("equipment_provided").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Module 13: Smart Match / Recommended Assignments
export const agentRecommendations = pgTable("agent_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  matchScore: decimal("match_score", { precision: 5, scale: 2 }), // 0-100 compatibility score
  skillsMatch: decimal("skills_match", { precision: 5, scale: 2 }), // 0-100 skills compatibility
  proximityScore: decimal("proximity_score", { precision: 5, scale: 2 }), // 0-100 location score
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }), // 0-100 past performance
  availabilityScore: decimal("availability_score", { precision: 5, scale: 2 }), // 0-100 schedule compatibility
  reasoning: text("reasoning"), // explanation of recommendation
  isRecommended: boolean("is_recommended").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  calculatedBy: varchar("calculated_by"), // system or user ID
});

// Project Heartbeat Monitor - Phase 2 Module
export const projectHeartbeats = pgTable("project_heartbeats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  currentBpm: integer("current_bpm").notNull().default(70), // Current heartbeat BPM
  healthScore: integer("health_score").notNull().default(100), // 0-100 health percentage
  projectStatus: varchar("project_status").notNull().default("healthy"), // healthy, elevated, critical, failed
  lastActivity: timestamp("last_activity").defaultNow(),
  lastHealthCheck: timestamp("last_health_check").defaultNow(),
  monitoringEnabled: boolean("monitoring_enabled").notNull().default(true),
  escalationCount: integer("escalation_count").notNull().default(0), // Number of active escalations
  failureThreshold: integer("failure_threshold").notNull().default(180), // BPM threshold for project failure
  baselineBpm: integer("baseline_bpm").notNull().default(70), // Baseline BPM for healthy project
  projectFailed: boolean("project_failed").notNull().default(false),
  failedAt: timestamp("failed_at"),
  autoReviewTriggered: boolean("auto_review_triggered").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Heartbeat Events - stores all events affecting project health
export const projectHeartbeatEvents = pgTable("project_heartbeat_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  heartbeatId: varchar("heartbeat_id").notNull().references(() => projectHeartbeats.id),
  eventType: varchar("event_type").notNull(), // issue_created, missed_checkin, budget_exceeded, etc.
  eventData: jsonb("event_data"), // Additional event context
  impact: varchar("impact").notNull(), // positive, neutral, negative
  healthScoreChange: integer("health_score_change").notNull().default(0), // BPM change (+/-)
  triggeredBy: varchar("triggered_by").references(() => users.id), // User who triggered the event
  automaticEvent: boolean("automatic_event").notNull().default(true), // System vs manual event
  notes: text("notes"), // Optional event notes
  createdAt: timestamp("created_at").defaultNow(),
});

// Project Health Log (optional) - for detailed historical tracking
export const projectHealthLog = pgTable("project_health_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  bpm: integer("bpm").notNull(),
  healthScore: integer("health_score").notNull(),
  eventType: varchar("event_type"), // What caused this health change
  eventId: varchar("event_id").references(() => projectHeartbeatEvents.id),
  projectStatus: varchar("project_status").notNull(),
  escalationCount: integer("escalation_count").notNull().default(0),
});

// Module 3: Job Visibility Logic (Enhanced location and skills)
export const agentSkills = pgTable("agent_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  skillName: varchar("skill_name").notNull(),
  proficiencyLevel: varchar("proficiency_level").notNull(), // beginner, intermediate, advanced, expert
  yearsExperience: integer("years_experience"),
  certificationLevel: varchar("certification_level"), // none, basic, advanced, professional
  verifiedBy: varchar("verified_by").references(() => users.id), // who verified this skill
  verifiedAt: timestamp("verified_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const agentLocations = pgTable("agent_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  serviceRadius: integer("service_radius").default(25), // miles willing to travel
  isPrimary: boolean("is_primary").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
  type: varchar("type").notNull(), // "access_request", "user_deletion", "high_budget_work_order", "high_budget_project", "issue_escalation"
  requestedById: varchar("requested_by_id").notNull().references(() => users.id),
  reviewerId: varchar("reviewer_id").references(() => users.id), // admin who needs to approve
  companyId: varchar("company_id").references(() => companies.id), // company context for request
  projectId: varchar("project_id").references(() => projects.id),
  workOrderId: varchar("work_order_id").references(() => workOrders.id),
  issueId: varchar("issue_id").references(() => issues.id),
  targetUserId: varchar("target_user_id").references(() => users.id), // user being deleted/affected
  budgetAmount: decimal("budget_amount", { precision: 10, scale: 2 }), // for budget approvals
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected
  requestData: jsonb("request_data"), // stores form data for user creation, etc.
  notes: text("notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  workOrders: many(workOrders),
  clientExclusiveNetworks: many(exclusiveNetworks, { relationName: "ClientCompany" }),
  serviceExclusiveNetworks: many(exclusiveNetworks, { relationName: "ServiceCompany" }),
}));

export const exclusiveNetworksRelations = relations(exclusiveNetworks, ({ one }) => ({
  clientCompany: one(companies, {
    fields: [exclusiveNetworks.clientCompanyId],
    references: [companies.id],
    relationName: "ClientCompany",
  }),
  serviceCompany: one(companies, {
    fields: [exclusiveNetworks.serviceCompanyId],
    references: [companies.id],
    relationName: "ServiceCompany",
  }),
  addedBy: one(users, {
    fields: [exclusiveNetworks.addedById],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  assignedWorkOrders: many(workOrders, { relationName: "assigneeWorkOrders" }),
  createdWorkOrders: many(workOrders, { relationName: "creatorWorkOrders" }),
  budgetCreatedWorkOrders: many(workOrders, { relationName: "budgetCreatorWorkOrders" }),
  timeEntries: many(timeEntries),
  sentMessages: many(messages, { relationName: "senderMessages" }),
  receivedMessages: many(messages, { relationName: "recipientMessages" }),
  notifications: many(notifications),
  addedExclusiveNetworks: many(exclusiveNetworks),
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

export const jobMessagesRelations = relations(jobMessages, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [jobMessages.workOrderId],
    references: [workOrders.id],
  }),
  sender: one(users, {
    fields: [jobMessages.senderId],
    references: [users.id],
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

export const structuredIssuesRelations = relations(structuredIssues, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [structuredIssues.workOrderId],
    references: [workOrders.id],
  }),
  reporter: one(users, {
    fields: [structuredIssues.reporterId],
    references: [users.id],
  }),
  reviewedBy: one(users, {
    fields: [structuredIssues.reviewedById],
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

export const jobRequestsRelations = relations(jobRequests, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [jobRequests.workOrderId],
    references: [workOrders.id],
  }),
  agent: one(users, {
    fields: [jobRequests.agentId],
    references: [users.id],
    relationName: "requestingAgent"
  }),
  reviewedBy: one(users, {
    fields: [jobRequests.reviewedBy],
    references: [users.id],
    relationName: "reviewingAdmin"
  }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [feedback.workOrderId],
    references: [workOrders.id],
  }),
  giver: one(users, {
    fields: [feedback.givenBy],
    references: [users.id],
    relationName: "feedbackGiver"
  }),
  receiver: one(users, {
    fields: [feedback.givenTo],
    references: [users.id],
    relationName: "feedbackReceiver"
  }),
}));

export const performanceSnapshotsRelations = relations(performanceSnapshots, ({ one }) => ({
  agent: one(users, {
    fields: [performanceSnapshots.agentId],
    references: [users.id],
  }),
}));

export const serviceQualitySnapshotsRelations = relations(serviceQualitySnapshots, ({ one }) => ({
  company: one(companies, {
    fields: [serviceQualitySnapshots.companyId],
    references: [companies.id],
  }),
}));

export const riskScoresRelations = relations(riskScores, ({ one, many }) => ({
  interventions: many(riskInterventions),
}));

export const riskInterventionsRelations = relations(riskInterventions, ({ one }) => ({
  riskScore: one(riskScores, {
    fields: [riskInterventions.riskId],
    references: [riskScores.id],
  }),
  assignedUser: one(users, {
    fields: [riskInterventions.assignedTo],
    references: [users.id],
  }),
}));

export const workOrderFiltersRelations = relations(workOrderFilters, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [workOrderFilters.workOrderId],
    references: [workOrders.id],
  }),
}));

export const agentRecommendationsRelations = relations(agentRecommendations, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [agentRecommendations.workOrderId],
    references: [workOrders.id],
  }),
  agent: one(users, {
    fields: [agentRecommendations.agentId],
    references: [users.id],
  }),
}));

export const agentSkillsRelations = relations(agentSkills, ({ one }) => ({
  agent: one(users, {
    fields: [agentSkills.agentId],
    references: [users.id],
  }),
  verifiedBy: one(users, {
    fields: [agentSkills.verifiedBy],
    references: [users.id],
  }),
}));

export const agentLocationsRelations = relations(agentLocations, ({ one }) => ({
  agent: one(users, {
    fields: [agentLocations.agentId],
    references: [users.id],
  }),
}));

// Role validation schema
export const rolesSchema = z.array(z.enum(['operations_director', 'administrator', 'manager', 'dispatcher', 'field_engineer', 'field_agent', 'client'])).min(1);

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

export const insertJobMessageSchema = createInsertSchema(jobMessages).omit({
  id: true,
  sentAt: true,
  editedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkOrderTaskSchema = createInsertSchema(workOrderTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertWorkOrderToolSchema = createInsertSchema(workOrderTools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  confirmedAt: true,
});

export const insertWorkOrderDocumentSchema = createInsertSchema(workOrderDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uploadedAt: true,
});

export const insertWorkOrderIssueSchema = createInsertSchema(workOrderIssues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
});

export const insertStructuredIssueSchema = createInsertSchema(structuredIssues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
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

export const insertExclusiveNetworkSchema = createInsertSchema(exclusiveNetworks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
});

export const insertPerformanceSnapshotSchema = createInsertSchema(performanceSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertServiceQualitySnapshotSchema = createInsertSchema(serviceQualitySnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertRiskScoreSchema = createInsertSchema(riskScores).omit({
  id: true,
  createdAt: true,
});

export const insertRiskInterventionSchema = createInsertSchema(riskInterventions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBidSchema = createInsertSchema(bids).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  acceptedAt: true,
  acceptedById: true,
});

export const insertCredentialSchema = createInsertSchema(credentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verifiedById: true,
  verifiedAt: true,
  renewalReminderSent: true,
});

export const insertRecognitionSchema = createInsertSchema(recognition).omit({
  id: true,
  awardedAt: true,
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
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
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

export const insertJobRequestSchema = createInsertSchema(jobRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  reviewedBy: true,
});

export const insertWorkOrderFilterSchema = createInsertSchema(workOrderFilters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentRecommendationSchema = createInsertSchema(agentRecommendations).omit({
  id: true,
  createdAt: true,
});

export const insertAgentSkillSchema = createInsertSchema(agentSkills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verifiedAt: true,
});

export const insertAgentLocationSchema = createInsertSchema(agentLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type ExclusiveNetwork = typeof exclusiveNetworks.$inferSelect;
export type InsertExclusiveNetwork = z.infer<typeof insertExclusiveNetworkSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type JobMessage = typeof jobMessages.$inferSelect;
export type InsertJobMessage = z.infer<typeof insertJobMessageSchema>;

export type WorkOrderTask = typeof workOrderTasks.$inferSelect;
export type InsertWorkOrderTask = z.infer<typeof insertWorkOrderTaskSchema>;

export type WorkOrderTool = typeof workOrderTools.$inferSelect;
export type InsertWorkOrderTool = z.infer<typeof insertWorkOrderToolSchema>;

export type WorkOrderDocument = typeof workOrderDocuments.$inferSelect;
export type InsertWorkOrderDocument = z.infer<typeof insertWorkOrderDocumentSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type WorkOrderIssue = typeof workOrderIssues.$inferSelect;
export type InsertWorkOrderIssue = z.infer<typeof insertWorkOrderIssueSchema>;

export type StructuredIssue = typeof structuredIssues.$inferSelect;
export type InsertStructuredIssue = z.infer<typeof insertStructuredIssueSchema>;

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

export type JobRequest = typeof jobRequests.$inferSelect;
export type InsertJobRequest = z.infer<typeof insertJobRequestSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

export type PerformanceSnapshot = typeof performanceSnapshots.$inferSelect;
export type InsertPerformanceSnapshot = z.infer<typeof insertPerformanceSnapshotSchema>;

export type ServiceQualitySnapshot = typeof serviceQualitySnapshots.$inferSelect;
export type InsertServiceQualitySnapshot = z.infer<typeof insertServiceQualitySnapshotSchema>;

export type RiskScore = typeof riskScores.$inferSelect;
export type InsertRiskScore = z.infer<typeof insertRiskScoreSchema>;

export type RiskIntervention = typeof riskInterventions.$inferSelect;
export type InsertRiskIntervention = z.infer<typeof insertRiskInterventionSchema>;

export type Bid = typeof bids.$inferSelect;
export type InsertBid = z.infer<typeof insertBidSchema>;

export type Credential = typeof credentials.$inferSelect;
export type InsertCredential = z.infer<typeof insertCredentialSchema>;

export type Recognition = typeof recognition.$inferSelect;
export type InsertRecognition = z.infer<typeof insertRecognitionSchema>;

export type WorkOrderFilter = typeof workOrderFilters.$inferSelect;
export type InsertWorkOrderFilter = z.infer<typeof insertWorkOrderFilterSchema>;

export type AgentRecommendation = typeof agentRecommendations.$inferSelect;
export type InsertAgentRecommendation = z.infer<typeof insertAgentRecommendationSchema>;

export type AgentSkill = typeof agentSkills.$inferSelect;
export type InsertAgentSkill = z.infer<typeof insertAgentSkillSchema>;

export type AgentLocation = typeof agentLocations.$inferSelect;
export type InsertAgentLocation = z.infer<typeof insertAgentLocationSchema>;

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

export function isFieldEngineer(user: User | null): boolean {
  return hasRole(user, 'field_engineer');
}

export function isFieldLevel(user: User | null): boolean {
  return hasAnyRole(user, ['field_agent', 'field_engineer']);
}

export function isClient(user: User | null): boolean {
  return hasRole(user, 'client');
}

export function canViewJobNetwork(user: User | null): boolean {
  return hasAnyRole(user, ['operations_director', 'administrator', 'project_manager', 'manager', 'dispatcher', 'client']);
}

export function canRequestWorkOrder(user: User | null): boolean {
  return hasAnyRole(user, ['administrator', 'manager', 'dispatcher']);
}

export function isOperationsDirector(user: User | null): boolean {
  return hasRole(user, 'operations_director');
}

export function canManageUsers(user: User | null): boolean {
  return hasAnyRole(user, ['operations_director', 'administrator', 'project_manager', 'manager']);
}

export function canDeleteAdmin(user: User | null): boolean {
  return isOperationsDirector(user);
}

export function canDeleteProjectManager(user: User | null): boolean {
  return hasAnyRole(user, ['operations_director', 'administrator']);
}

export function canDeleteManager(user: User | null): boolean {
  return hasAnyRole(user, ['operations_director', 'administrator', 'project_manager']);
}

export function canDeleteDispatcher(user: User | null): boolean {
  return hasAnyRole(user, ['operations_director', 'administrator', 'project_manager', 'manager']);
}

export function canSelfAssignWorkOrders(user: User | null): boolean {
  return hasAnyRole(user, ['field_engineer']);
}

export function canMessageOperationsDirector(user: User | null): boolean {
  return hasRole(user, 'administrator');
}

export function canManageWorkOrders(user: User | null): boolean {
  return hasAnyRole(user, ['administrator', 'manager', 'dispatcher']);
}

export function canViewBudgets(user: User | null): boolean {
  return hasAnyRole(user, ['operations_director', 'administrator', 'project_manager', 'manager', 'field_engineer']);
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
  return isOperationsDirector(user) || isAdminTeam(user);
}

export function canPostToJobNetwork(user: User | null): boolean {
  return isOperationsDirector(user) || isAdminTeam(user) || isClient(user);
}

export function canViewExclusiveNetwork(user: User | null): boolean {
  return isOperationsDirector(user) || isAdminTeam(user);
}

export function canAssignWorkOrders(user: User | null): boolean {
  return isOperationsDirector(user) || isAdminTeam(user);
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

// Onboarding Requests table - for contractor applications
export const onboardingRequests = pgTable("onboarding_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  company: varchar("company"),
  skills: text("skills").array().default(sql`ARRAY[]::TEXT[]`),
  resumeUrl: varchar("resume_url"),
  motivation: text("motivation"),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Onboarding Request relations
export const onboardingRequestsRelations = relations(onboardingRequests, ({ one }) => ({
  reviewer: one(users, {
    fields: [onboardingRequests.reviewedBy],
    references: [users.id],
  }),
}));

// Onboarding Request types
export type OnboardingRequest = typeof onboardingRequests.$inferSelect;
export type InsertOnboardingRequest = typeof onboardingRequests.$inferInsert;

export const insertOnboardingRequestSchema = createInsertSchema(onboardingRequests).omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOnboardingRequestType = z.infer<typeof insertOnboardingRequestSchema>;

// Project Heartbeat types
export type ProjectHeartbeat = typeof projectHeartbeats.$inferSelect;
export type InsertProjectHeartbeat = typeof projectHeartbeats.$inferInsert;

export const insertProjectHeartbeatSchema = createInsertSchema(projectHeartbeats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectHeartbeatType = z.infer<typeof insertProjectHeartbeatSchema>;

// Heartbeat Event types
export type HeartbeatEvent = typeof projectHeartbeatEvents.$inferSelect;
export type InsertHeartbeatEvent = typeof projectHeartbeatEvents.$inferInsert;

export const insertHeartbeatEventSchema = createInsertSchema(projectHeartbeatEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertHeartbeatEventType = z.infer<typeof insertHeartbeatEventSchema>;

// Project Heartbeat Relations
export const projectHeartbeatsRelations = relations(projectHeartbeats, ({ one, many }) => ({
  workOrder: one(workOrders, {
    fields: [projectHeartbeats.workOrderId],
    references: [workOrders.id],
  }),
  events: many(projectHeartbeatEvents),
}));

export const projectHeartbeatEventsRelations = relations(projectHeartbeatEvents, ({ one }) => ({
  heartbeat: one(projectHeartbeats, {
    fields: [projectHeartbeatEvents.heartbeatId],
    references: [projectHeartbeats.id],
  }),
  triggeredByUser: one(users, {
    fields: [projectHeartbeatEvents.triggeredBy],
    references: [users.id],
  }),
}));

export const projectHealthLogRelations = relations(projectHealthLog, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [projectHealthLog.workOrderId],
    references: [workOrders.id],
  }),
  event: one(projectHeartbeatEvents, {
    fields: [projectHealthLog.eventId],
    references: [projectHeartbeatEvents.id],
  }),
}));
