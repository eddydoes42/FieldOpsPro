import {
  users,
  companies,
  exclusiveNetworks,
  workOrders,
  timeEntries,
  messages,
  jobMessages,
  workOrderTasks,
  workOrderTools,
  workOrderDocuments,
  documents,
  workOrderIssues,
  structuredIssues,
  auditLogs,
  notifications,
  clientFieldAgentRatings,
  clientDispatcherRatings,
  serviceClientRatings,
  issues,
  jobNetworkPosts,
  exclusiveNetworkPosts,
  workOrderRequests,
  exclusiveNetworkMembers,
  projects,
  projectRequirements,
  projectAssignments,
  approvalRequests,
  accessRequests,
  jobRequests,
  onboardingRequests,
  feedback,
  performanceSnapshots,
  serviceQualitySnapshots,
  riskScores,
  riskInterventions,
  bids,
  credentials,
  recognition,
  workOrderFilters,
  agentRecommendations,
  agentSkills,
  agentLocations,
  projectHeartbeats,
  projectHeartbeatEvents,
  projectHealthLog,
  type User,
  type UpsertUser,
  type InsertUser,
  type Company,
  type InsertCompany,
  type WorkOrder,
  type InsertWorkOrder,
  type TimeEntry,
  type InsertTimeEntry,
  type Message,
  type InsertMessage,
  type WorkOrderTask,
  type InsertWorkOrderTask,
  type WorkOrderIssue,
  type InsertWorkOrderIssue,
  type StructuredIssue,
  type InsertStructuredIssue,
  type AuditLog,
  type InsertAuditLog,
  type Notification,
  type InsertNotification,
  type ClientFieldAgentRating,
  type InsertClientFieldAgentRating,
  type ClientDispatcherRating,
  type InsertClientDispatcherRating,
  type ServiceClientRating,
  type InsertServiceClientRating,
  type Issue,
  type InsertIssue,
  type JobNetworkPost,
  type InsertJobNetworkPost,
  type ExclusiveNetworkPost,
  type InsertExclusiveNetworkPost,
  type WorkOrderRequest,
  type InsertWorkOrderRequest,
  type ExclusiveNetworkMember,
  type InsertExclusiveNetworkMember,
  type Project,
  type InsertProject,
  type ProjectRequirement,
  type InsertProjectRequirement,
  type ProjectAssignment,
  type InsertProjectAssignment,
  type ApprovalRequest,
  type InsertApprovalRequest,
  type AccessRequest,
  type InsertAccessRequest,
  type JobRequest,
  type InsertJobRequest,
  type JobMessage,
  type InsertJobMessage,
  type ExclusiveNetwork,
  type InsertExclusiveNetwork,
  type OnboardingRequest,
  type InsertOnboardingRequest,
  type Feedback,
  type InsertFeedback,
  type PerformanceSnapshot,
  type InsertPerformanceSnapshot,
  type ServiceQualitySnapshot,
  type InsertServiceQualitySnapshot,
  type RiskScore,
  type InsertRiskScore,
  type RiskIntervention,
  type InsertRiskIntervention,
  type WorkOrderTool,
  type InsertWorkOrderTool,
  type WorkOrderDocument,
  type InsertWorkOrderDocument,
  type Document,
  type InsertDocument,
  type Bid,
  type InsertBid,
  type Credential,
  type InsertCredential,
  type Recognition,
  type InsertRecognition,
  type WorkOrderFilter,
  type InsertWorkOrderFilter,
  type AgentRecommendation,
  type InsertAgentRecommendation,
  type AgentSkill,
  type InsertAgentSkill,
  type AgentLocation,
  type InsertAgentLocation,
  type ProjectHeartbeat,
  type InsertProjectHeartbeat,
  type HeartbeatEvent,
  type InsertHeartbeatEvent,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, isNull, isNotNull, count, avg, sum, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  getFieldAgents(): Promise<User[]>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;

  // Company operations
  createCompany(company: InsertCompany): Promise<Company>;
  getCompany(id: string): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;
  updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company>;
  deleteCompany(id: string): Promise<void>;

  // Operations Director statistics and data
  getOperationsStats(): Promise<{
    totalAdmins: number;
    activeCompanies: number;
    recentSetups: number;
  }>;
  getOperationsAdmins(): Promise<any[]>;
  getRecentUsers(): Promise<any[]>;
  
  // Company statistics
  getCompanyStats(companyId: string): Promise<{
    onboardedUsers: number;
    activeWorkOrders: number;
    completedWorkOrders: number;
    successRate: number;
  }>;

  // Work Order operations
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  getWorkOrder(id: string): Promise<WorkOrder | undefined>;
  getWorkOrdersByAssignee(assigneeId: string): Promise<WorkOrder[]>;
  getWorkOrdersByCreator(creatorId: string): Promise<WorkOrder[]>;
  getAllWorkOrders(): Promise<WorkOrder[]>;
  updateWorkOrder(id: string, updates: Partial<InsertWorkOrder>): Promise<WorkOrder>;
  updateWorkOrderStatus(id: string, updateData: any): Promise<WorkOrder>;
  updateAssignmentProgressStatus(id: string, status: string): Promise<WorkOrder>;
  scheduleWorkOrder(id: string): Promise<WorkOrder>;
  deleteWorkOrder(id: string): Promise<void>;
  assignWorkOrderAgent(workOrderId: string, assigneeId: string): Promise<WorkOrder>;

  // Work Order Tools operations
  createWorkOrderTool(tool: InsertWorkOrderTool): Promise<WorkOrderTool>;
  getWorkOrderTools(workOrderId: string): Promise<WorkOrderTool[]>;
  updateWorkOrderTool(id: string, updates: Partial<InsertWorkOrderTool>): Promise<WorkOrderTool>;
  deleteWorkOrderTool(id: string): Promise<void>;

  // Work Order Documents operations
  createWorkOrderDocument(document: InsertWorkOrderDocument): Promise<WorkOrderDocument>;
  getWorkOrderDocuments(workOrderId: string): Promise<WorkOrderDocument[]>;
  updateWorkOrderDocument(id: string, updates: Partial<InsertWorkOrderDocument>): Promise<WorkOrderDocument>;
  deleteWorkOrderDocument(id: string): Promise<void>;

  // Time Entry operations
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  getActiveTimeEntry(userId: string): Promise<TimeEntry | undefined>;
  getAllActiveTimeEntries(): Promise<TimeEntry[]>;
  getTimeEntriesByUser(userId: string): Promise<TimeEntry[]>;
  getTimeEntriesByWorkOrder(workOrderId: string): Promise<TimeEntry[]>;
  updateTimeEntry(id: string, updates: Partial<InsertTimeEntry>): Promise<TimeEntry>;
  endTimeEntry(id: string, endTime: Date): Promise<TimeEntry>;
  startTimeEntry(userId: string, workOrderId: string): Promise<TimeEntry>;
  endActiveTimeEntry(userId: string, workOrderId: string): Promise<TimeEntry | null>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByRecipient(recipientId: string): Promise<Message[]>;
  getMessagesBySender(senderId: string): Promise<Message[]>;
  getMessagesForWorkOrder(workOrderId: string): Promise<Message[]>;
  markMessageAsRead(id: string): Promise<Message>;
  
  // Job Message operations
  createJobMessage(jobMessage: InsertJobMessage): Promise<JobMessage>;
  getJobMessagesByWorkOrder(workOrderId: string): Promise<JobMessage[]>;
  updateJobMessage(id: string, updates: Partial<InsertJobMessage>): Promise<JobMessage>;
  pinJobMessage(id: string): Promise<JobMessage>;
  unpinJobMessage(id: string): Promise<JobMessage>;
  getAllMessages(): Promise<Message[]>;
  getUserMessages(userId: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;

  // Dashboard statistics
  getDashboardStats(): Promise<{
    totalUsers: number;
    activeOrders: number;
    completedOrders: number;
    totalOrders: number;
    adminCount: number;
    managerCount: number;
    agentCount: number;
    clientCount: number;
  }>;

  // Team reports
  getTeamReports(): Promise<{
    agentPerformance: any[];
    workOrderStats: any;
    timeTrackingStats: any;
    completionRates: any[];
    monthlyTrends: any[];
  }>;

  // Work Order Task operations
  getWorkOrderTask(id: string): Promise<WorkOrderTask | undefined>;
  getWorkOrderTasks(workOrderId: string): Promise<WorkOrderTask[]>;
  createWorkOrderTask(task: InsertWorkOrderTask): Promise<WorkOrderTask>;
  updateWorkOrderTask(id: string, updates: Partial<InsertWorkOrderTask>): Promise<WorkOrderTask>;
  deleteWorkOrderTask(id: string): Promise<void>;

  // Work Order Issue operations
  getWorkOrderIssues(workOrderId: string): Promise<WorkOrderIssue[]>;
  createWorkOrderIssue(issue: InsertWorkOrderIssue): Promise<WorkOrderIssue>;
  getAllIssues(): Promise<WorkOrderIssue[]>;

  // Issue operations (hazard reporting)
  createIssue(issue: InsertIssue): Promise<Issue>;
  getIssue(id: string): Promise<Issue | undefined>;
  getIssuesByWorkOrder(workOrderId: string): Promise<Issue[]>;
  getIssuesByCompany(companyId: string): Promise<Issue[]>;
  getAllOpenIssues(): Promise<Issue[]>;
  updateIssue(id: string, updates: Partial<InsertIssue>): Promise<Issue>;
  resolveIssue(id: string, resolvedById: string, resolution: string): Promise<Issue>;

  // Status and time tracking operations
  updateWorkOrderStatus(id: string, updateData: any): Promise<WorkOrder>;
  startTimeEntry(userId: string, workOrderId: string): Promise<TimeEntry>;
  endActiveTimeEntry(userId: string, workOrderId: string): Promise<TimeEntry | null>;
  markTaskComplete(taskId: string, userId: string): Promise<WorkOrderTask>;

  // Notification operations
  createNotification(notificationData: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationsByUser(userId: string): Promise<Notification[]>;
  updateNotification(id: string, updates: Partial<InsertNotification>): Promise<Notification>;
  confirmWorkOrderNotification(notificationId: string, workOrderId: string): Promise<WorkOrder>;

  // Client management and job network operations
  getClientWorkOrders(clientId: string): Promise<WorkOrder[]>;
  getJobNetworkWorkOrders(): Promise<WorkOrder[]>;
  getClientAssignmentRequests(clientId: string): Promise<any[]>;
  respondToAssignmentRequest(requestId: string, action: 'accept' | 'decline', notes: string, clientId: string): Promise<any>;
  requestWorkOrderAssignment(workOrderId: string, agentId: string, requestedById: string, notes?: string): Promise<any>;
  getFieldAgents(): Promise<User[]>;

  // Work Order Request operations
  createWorkOrderRequest(request: InsertWorkOrderRequest): Promise<WorkOrderRequest>;
  getWorkOrderRequestsByClient(clientCompanyId: string): Promise<WorkOrderRequest[]>;
  getWorkOrderRequestsByServiceCompany(serviceCompanyId: string): Promise<WorkOrderRequest[]>;
  respondToWorkOrderRequest(requestId: string, status: 'approved' | 'declined', reviewedById: string, clientResponse?: string): Promise<WorkOrderRequest>;
  getJobNetworkPosts(): Promise<JobNetworkPost[]>;
  getExclusiveNetworkPosts(): Promise<ExclusiveNetworkPost[]>;

  // Client final approval and profit calculation operations
  clientApprovalWorkOrder(workOrderId: string, status: 'approved' | 'rejected' | 'requires_revision', clientId: string, notes?: string): Promise<WorkOrder>;
  calculateProfit(workOrderId: string): Promise<WorkOrder>;
  getPendingClientApprovals(clientCompanyId?: string): Promise<WorkOrder[]>;
  getCompletedWorkOrdersForApproval(): Promise<WorkOrder[]>;

  // Rating operations
  createClientFieldAgentRating(rating: InsertClientFieldAgentRating): Promise<ClientFieldAgentRating>;
  createClientDispatcherRating(rating: InsertClientDispatcherRating): Promise<ClientDispatcherRating>;
  createServiceClientRating(rating: InsertServiceClientRating): Promise<ServiceClientRating>;
  getClientFieldAgentRating(workOrderId: string, clientId: string): Promise<ClientFieldAgentRating | undefined>;
  getClientDispatcherRating(workOrderId: string, clientId: string): Promise<ClientDispatcherRating | undefined>;
  getServiceClientRating(workOrderId: string, raterId: string): Promise<ServiceClientRating | undefined>;
  getFieldAgentRatings(fieldAgentId: string): Promise<ClientFieldAgentRating[]>;
  getDispatcherRatings(dispatcherId: string): Promise<ClientDispatcherRating[]>;
  getClientRatings(clientId: string): Promise<ServiceClientRating[]>;
  updateUserRatings(userId: string): Promise<void>;

  // Work Order Tools operations
  createWorkOrderTool(tool: InsertWorkOrderTool): Promise<WorkOrderTool>;
  getWorkOrderTools(workOrderId: string): Promise<WorkOrderTool[]>;
  updateWorkOrderTool(id: string, updates: Partial<InsertWorkOrderTool>): Promise<WorkOrderTool>;
  deleteWorkOrderTool(id: string): Promise<void>;
  confirmToolAvailability(id: string, confirmedById: string): Promise<WorkOrderTool>;

  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocuments(entityType: string, entityId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // Work Order Documents operations
  createWorkOrderDocument(document: InsertWorkOrderDocument): Promise<WorkOrderDocument>;
  getWorkOrderDocuments(workOrderId: string): Promise<WorkOrderDocument[]>;
  updateWorkOrderDocument(id: string, updates: Partial<InsertWorkOrderDocument>): Promise<WorkOrderDocument>;
  deleteWorkOrderDocument(id: string): Promise<void>;
  markDocumentCompleted(id: string, completedById: string): Promise<WorkOrderDocument>;

  // Feedback operations (Client Feedback Loop)
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedbackByWorkOrder(workOrderId: string): Promise<Feedback | undefined>;
  getFeedbackByAgent(agentId: string): Promise<Feedback[]>;
  getAllFeedback(filters: {
    companyId?: string;
    stars?: number;
    dateFrom?: string;
    dateTo?: string;
    agentId?: string;
    limit: number;
    offset: number;
  }): Promise<Feedback[]>;
  updateCompanyRatings(companyId: string): Promise<void>;
  
  // Exclusive Network operations
  createExclusiveNetwork(data: InsertExclusiveNetwork): Promise<ExclusiveNetwork>;
  getExclusiveNetworks(clientCompanyId?: string, serviceCompanyId?: string): Promise<ExclusiveNetwork[]>;
  deleteExclusiveNetwork(id: string): Promise<void>;
  getExclusiveServiceCompanies(clientCompanyId: string): Promise<Company[]>;
  
  // Exclusive Network Member operations  
  createExclusiveNetworkMember(member: InsertExclusiveNetworkMember): Promise<ExclusiveNetworkMember>;
  getExclusiveNetworkMembers(clientCompanyId: string): Promise<ExclusiveNetworkMember[]>;
  getAllExclusiveNetworkMembers(): Promise<ExclusiveNetworkMember[]>;
  updateExclusiveNetworkMember(id: string, updates: Partial<InsertExclusiveNetworkMember>): Promise<ExclusiveNetworkMember>;
  checkExclusiveNetworkEligibility(clientCompanyId: string, serviceCompanyId: string): Promise<boolean>;

  // Project operations
  getProjects(): Promise<Project[]>;
  getAllProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project>;
  requestProjectAssignment(projectId: string, companyId: string, requestedById: string): Promise<ProjectAssignment>;
  getProjectAssignments(projectId: string): Promise<ProjectAssignment[]>;
  
  // Project budget deduction workflow
  approveBudget(projectId: string, approvedById: string): Promise<Project>;
  deductBudget(projectId: string, actualCost?: number): Promise<Project>;
  cancelBudgetApproval(projectId: string): Promise<Project>;
  getProjectsBudgetStatus(status?: string): Promise<Project[]>;
  
  // Project Requirements operations
  createProjectRequirement(requirement: InsertProjectRequirement): Promise<ProjectRequirement>;
  getProjectRequirements(projectId: string): Promise<ProjectRequirement[]>;
  updateProjectRequirement(id: string, updates: Partial<InsertProjectRequirement>): Promise<ProjectRequirement>;
  
  // Approval Requests operations
  createApprovalRequest(request: InsertApprovalRequest): Promise<ApprovalRequest>;
  getApprovalRequests(reviewerId: string): Promise<ApprovalRequest[]>;
  getAllApprovalRequests(): Promise<ApprovalRequest[]>;
  reviewApprovalRequest(id: string, status: 'approved' | 'denied', reviewerId: string, response?: string): Promise<ApprovalRequest>;
  
  // Access Requests operations
  createAccessRequest(request: InsertAccessRequest): Promise<AccessRequest>;
  getAllAccessRequests(): Promise<AccessRequest[]>;
  getPendingAccessRequests(): Promise<AccessRequest[]>;
  updateAccessRequest(id: string, updates: Partial<InsertAccessRequest>): Promise<AccessRequest>;
  reviewAccessRequest(id: string, status: 'approved' | 'rejected', reviewedById: string, notes?: string): Promise<AccessRequest>;
  
  // Job Requests operations
  createJobRequest(request: InsertJobRequest): Promise<JobRequest>;
  getJobRequestsByWorkOrder(workOrderId: string): Promise<JobRequest[]>;
  getJobRequestsByCompany(companyId: string): Promise<JobRequest[]>;
  getJobRequestsByAgent(agentId: string): Promise<JobRequest[]>;
  reviewJobRequest(id: string, status: 'approved' | 'rejected', reviewedById: string, rejectionReason?: string): Promise<JobRequest>;

  // Structured Issue operations (enhanced issue reporting)
  createStructuredIssue(issue: InsertStructuredIssue): Promise<StructuredIssue>;
  getStructuredIssue(id: string): Promise<StructuredIssue | undefined>;
  getStructuredIssues(workOrderId?: string): Promise<StructuredIssue[]>;
  updateStructuredIssue(id: string, updates: Partial<InsertStructuredIssue>): Promise<StructuredIssue>;
  getStructuredIssueById(id: string): Promise<StructuredIssue | null>;

  // Audit Log operations (operational transparency)
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  getAuditLogsByUser(userId: string): Promise<AuditLog[]>;
  getAllAuditLogs(limit?: number, offset?: number): Promise<AuditLog[]>;
  getAuditLogsForAdmin(filters?: { entityType?: string; userId?: string; startDate?: Date; endDate?: Date }): Promise<AuditLog[]>;

  // Onboarding Request operations
  createOnboardingRequest(request: InsertOnboardingRequest): Promise<OnboardingRequest>;
  getAllOnboardingRequests(): Promise<OnboardingRequest[]>;
  getOnboardingRequest(id: string): Promise<OnboardingRequest | undefined>;
  reviewOnboardingRequest(id: string, status: 'approved' | 'rejected', reviewedById: string, rejectionReason?: string): Promise<OnboardingRequest>;

  // Bid operations (Module 14)
  createBid(bid: InsertBid): Promise<Bid>;
  getBid(id: string): Promise<Bid | undefined>;
  getBidsForWorkOrder(workOrderId: string): Promise<Bid[]>;
  getBidsForUser(userId: string): Promise<Bid[]>;
  updateBid(id: string, updates: Partial<InsertBid>): Promise<Bid>;
  acceptBid(id: string, acceptedById: string): Promise<Bid>;
  rejectBid(id: string, notes?: string): Promise<Bid>;

  // Credential operations (Module 15)
  createCredential(credential: InsertCredential): Promise<Credential>;
  getCredential(id: string): Promise<Credential | undefined>;
  getUserCredentials(userId: string): Promise<Credential[]>;
  updateCredential(id: string, updates: Partial<InsertCredential>): Promise<Credential>;
  deleteCredential(id: string): Promise<void>;
  getExpiringCredentials(daysFromNow: number): Promise<Credential[]>;

  // Recognition operations (Module 16)
  createRecognition(recognition: InsertRecognition): Promise<Recognition>;
  getUserRecognition(userId: string): Promise<Recognition[]>;
  updateRecognition(id: string, updates: Partial<InsertRecognition>): Promise<Recognition>;
  deleteRecognition(id: string): Promise<void>;

  // Category Performance operations (Module 11)
  getCategoryPerformanceMetrics(): Promise<{
    category: string;
    totalJobs: number;
    averageMargin: number;
    averageCompletionHours: number;
    totalRevenue: number;
  }[]>;

  // Work Order Filter operations (Module 12)
  createWorkOrderFilter(filter: InsertWorkOrderFilter): Promise<WorkOrderFilter>;
  getWorkOrderFilter(workOrderId: string): Promise<WorkOrderFilter | undefined>;
  updateWorkOrderFilter(workOrderId: string, updates: Partial<InsertWorkOrderFilter>): Promise<WorkOrderFilter>;
  deleteWorkOrderFilter(workOrderId: string): Promise<void>;

  // Agent Recommendation operations (Module 13)
  createAgentRecommendation(recommendation: InsertAgentRecommendation): Promise<AgentRecommendation>;
  getAgentRecommendations(workOrderId: string): Promise<AgentRecommendation[]>;
  updateAgentRecommendation(id: string, updates: Partial<InsertAgentRecommendation>): Promise<AgentRecommendation>;
  deleteAgentRecommendation(id: string): Promise<void>;
  generateRecommendationsForWorkOrder(workOrderId: string): Promise<AgentRecommendation[]>;

  // Agent Skills operations (Module 3)
  createAgentSkill(skill: InsertAgentSkill): Promise<AgentSkill>;
  getAgentSkills(agentId: string): Promise<AgentSkill[]>;
  updateAgentSkill(id: string, updates: Partial<InsertAgentSkill>): Promise<AgentSkill>;
  deleteAgentSkill(id: string): Promise<void>;
  verifyAgentSkill(id: string, verifiedById: string): Promise<AgentSkill>;

  // Agent Location operations (Module 3)
  createAgentLocation(location: InsertAgentLocation): Promise<AgentLocation>;
  getAgentLocations(agentId: string): Promise<AgentLocation[]>;
  getPrimaryAgentLocation(agentId: string): Promise<AgentLocation | undefined>;
  updateAgentLocation(id: string, updates: Partial<InsertAgentLocation>): Promise<AgentLocation>;
  deleteAgentLocation(id: string): Promise<void>;
  setPrimaryLocation(agentId: string, locationId: string): Promise<void>;

  // Enhanced Search operations (Module 12)
  searchWorkOrdersWithFilters(filters: {
    skillTags?: string[];
    locationRadius?: number;
    minPayRate?: number;
    maxPayRate?: number;
    urgencyLevel?: string;
    experienceRequired?: string;
    certificationRequired?: string[];
    equipmentProvided?: boolean;
    agentLocation?: { lat: number; lng: number };
  }): Promise<WorkOrder[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(sql`${role} = ANY(${users.roles})`);
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getFieldAgents(): Promise<User[]> {
    // Get all users with field_agent or field_engineer role
    const fieldAgents = await db
      .select()
      .from(users)
      .where(or(
        sql`'field_agent' = ANY(${users.roles})`,
        sql`'field_engineer' = ANY(${users.roles})`
      ))
      .orderBy(users.firstName, users.lastName);

    // Get company information separately to avoid join issues
    const companiesData = await db.select().from(companies);

    // Get work order completion counts for each agent
    const workOrderCompletions = await db
      .select({
        assigneeId: workOrders.assigneeId,
        completedCount: count(workOrders.id)
      })
      .from(workOrders)
      .where(eq(workOrders.status, 'completed'))
      .groupBy(workOrders.assigneeId);

    // Get unresolved issues count for each agent
    const unresolvedIssuesCount = await db
      .select({
        reportedById: issues.reportedById,
        issueCount: count(issues.id)
      })
      .from(issues)
      .where(eq(issues.status, 'open'))
      .groupBy(issues.reportedById);

    // Create lookup maps for performance
    const completionsMap = new Map(workOrderCompletions.map(item => [item.assigneeId, item.completedCount]));
    const issuesMap = new Map(unresolvedIssuesCount.map(item => [item.reportedById, item.issueCount]));

    // Create company lookup map
    const companiesMap = new Map(companiesData.map(company => [company.id, company]));

    // Transform the data to include company information and additional agent details
    return fieldAgents.map(agent => {
      const completedJobs = completionsMap.get(agent.id || '') || 0;
      const unresolvedIssues = issuesMap.get(agent.id || '') || 0;
      const company = agent.companyId ? companiesMap.get(agent.companyId) : null;
      
      // Calculate years of experience based on creation date
      const yearsExperience = agent.createdAt 
        ? Math.max(1, Math.floor((Date.now() - agent.createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
        : 2;

      // Generate rating based on performance (higher for more completed jobs and fewer issues)
      let rating = 3.5;
      if (completedJobs > 20) rating += 0.5;
      if (completedJobs > 50) rating += 0.5;
      if (unresolvedIssues === 0) rating += 0.3;
      if (unresolvedIssues > 3) rating -= 0.5;
      rating = Math.min(5.0, Math.max(1.0, rating));

      // Determine specializations based on role
      const specializations = agent.roles?.includes('field_engineer') 
        ? ['Network Installation', 'Hardware Setup', 'Server Configuration', 'Cable Management']
        : ['Network Installation', 'Hardware Setup'];

      return {
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        phone: agent.phone,
        address: agent.address,
        city: agent.city,
        state: agent.state,
        zipCode: agent.zipCode,
        roles: agent.roles,
        isActive: agent.isActive,
        companyId: agent.companyId,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        company: company ? {
          id: company.id,
          name: company.name
        } : undefined,
        // Enhanced agent-specific fields for talent network
        location: agent.city && agent.state ? `${agent.city}, ${agent.state}` : null,
        specializations,
        rating: Math.round(rating * 10) / 10,
        completedJobs,
        unresolvedIssues,
        yearsExperience,
        certifications: agent.roles?.includes('field_engineer') 
          ? ['CompTIA Network+', 'Cisco CCNA', 'CompTIA Security+']
          : ['CompTIA Network+'],
        availability: agent.isActive ? 'Available' : 'Unavailable',
        lastActive: agent.updatedAt?.toISOString() || agent.createdAt?.toISOString()
      } as any;
    });
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Company operations
  async createCompany(companyData: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(companyData).returning();
    return company;
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(companies.name);
  }

  async updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company> {
    const [company] = await db
      .update(companies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return company;
  }

  async deleteCompany(id: string): Promise<void> {
    // First, delete all users linked to this company
    await db
      .delete(users)
      .where(eq(users.companyId, id));
    
    // Then delete the company
    await db.delete(companies).where(eq(companies.id, id));
  }

  async getOperationsStats(): Promise<{
    totalAdmins: number;
    activeCompanies: number;
    recentSetups: number;
  }> {
    // Count administrators across all companies
    const adminResult = await db
      .select({ count: count() })
      .from(users)
      .where(sql`'administrator' = ANY(${users.roles})`);

    // Count active companies
    const companyResult = await db
      .select({ count: count() })
      .from(companies)
      .where(eq(companies.isActive, true));

    // Count recent setups (companies created in last 30 days)
    const recentResult = await db
      .select({ count: count() })
      .from(companies)
      .where(sql`${companies.createdAt} >= CURRENT_DATE - INTERVAL '30 days'`);

    return {
      totalAdmins: adminResult[0]?.count || 0,
      activeCompanies: companyResult[0]?.count || 0,
      recentSetups: recentResult[0]?.count || 0,
    };
  }

  async getOperationsAdmins(): Promise<any[]> {
    const result = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        roles: users.roles,
        companyId: users.companyId,
        isActive: sql<boolean>`true`, // Assuming all users are active
        createdAt: users.createdAt,
        lastLoginAt: sql<string>`null`, // TODO: Add last login tracking
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(sql`'administrator' = ANY(${users.roles})`)
      .orderBy(desc(users.createdAt));

    // Add company names
    const adminsWithCompanies = await Promise.all(
      result.map(async (admin) => {
        let companyName = null;
        if (admin.companyId) {
          const company = await this.getCompany(admin.companyId);
          companyName = company?.name || null;
        }
        return {
          ...admin,
          companyName,
        };
      })
    );

    return adminsWithCompanies;
  }

  async getRecentUsers(): Promise<any[]> {
    const result = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        roles: users.roles,
        companyId: users.companyId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(sql`${users.createdAt} >= CURRENT_DATE - INTERVAL '30 days'`)
      .orderBy(desc(users.createdAt));

    // Add company names
    const usersWithCompanies = await Promise.all(
      result.map(async (user) => {
        let companyName = null;
        if (user.companyId) {
          const company = await this.getCompany(user.companyId);
          companyName = company?.name || null;
        }
        return {
          ...user,
          companyName,
          onboardedBy: 'Operations Director', // TODO: Track who onboarded each user
        };
      })
    );

    return usersWithCompanies;
  }

  // Work Order operations
  async createWorkOrder(workOrderData: InsertWorkOrder & { tools?: any[], documents?: any[] }): Promise<WorkOrder> {
    // Generate 6-digit work order ID
    const allOrders = await db.select({ id: workOrders.id }).from(workOrders).orderBy(workOrders.id);
    let nextNumber = 1;
    
    if (allOrders.length > 0) {
      // Extract numbers from existing IDs and find the highest
      const numbers = allOrders
        .map(order => parseInt(order.id))
        .filter(num => !isNaN(num))
        .sort((a, b) => b - a);
      
      if (numbers.length > 0) {
        nextNumber = numbers[0] + 1;
      }
    }
    
    const workOrderId = nextNumber.toString().padStart(6, '0');
    
    const [workOrder] = await db.insert(workOrders).values({
      ...workOrderData,
      id: workOrderId,
      status: 'scheduled' // Always start with scheduled status
    }).returning();

    // Create work order tools if provided
    if (workOrderData.tools && workOrderData.tools.length > 0) {
      const toolsData = workOrderData.tools.map(tool => ({
        id: nanoid(),
        workOrderId: workOrder.id,
        name: tool.name,
        description: tool.description || null,
        category: tool.category,
        isRequired: tool.isRequired,
      }));
      
      await db.insert(workOrderTools).values(toolsData);
    }

    // Create work order documents if provided
    if (workOrderData.documents && workOrderData.documents.length > 0) {
      const documentsData = workOrderData.documents.map(doc => ({
        id: nanoid(),
        workOrderId: workOrder.id,
        name: doc.name,
        description: doc.description || null,
        category: doc.category,
        fileUrl: doc.fileUrl || null,
        isRequired: doc.isRequired,
      }));
      
      await db.insert(workOrderDocuments).values(documentsData);
    }

    // Create a notification for 24 hours before the due date (if there's an assignee and due date)
    if (workOrderData.assigneeId && workOrderData.dueDate) {
      const notificationTime = new Date(workOrderData.dueDate);
      notificationTime.setHours(notificationTime.getHours() - 24);
      
      // Only create notification if it's in the future
      if (notificationTime > new Date()) {
        await this.createNotification({
          userId: workOrderData.assigneeId,
          workOrderId: workOrder.id,
          type: 'work_order_confirmation',
          title: 'Work Order Confirmation Required',
          message: `Please confirm work order "${workOrderData.title}" scheduled for ${workOrderData.dueDate ? new Date(workOrderData.dueDate).toLocaleDateString() : 'tomorrow'}.`,
          isRead: false,
          isConfirmed: false,
        });
      }
    }
    return workOrder;
  }

  async getWorkOrder(id: string): Promise<WorkOrder | undefined> {
    const [workOrder] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return workOrder;
  }

  async getWorkOrdersByAssignee(assigneeId: string): Promise<WorkOrder[]> {
    return await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.assigneeId, assigneeId))
      .orderBy(desc(workOrders.createdAt));
  }

  async getWorkOrdersByCreator(creatorId: string): Promise<WorkOrder[]> {
    return await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.createdById, creatorId))
      .orderBy(desc(workOrders.createdAt));
  }

  async getAllWorkOrders(): Promise<WorkOrder[]> {
    return await db.select().from(workOrders).orderBy(desc(workOrders.createdAt));
  }

  async updateWorkOrder(id: string, updates: Partial<InsertWorkOrder>): Promise<WorkOrder> {
    // Handle date string conversion
    const processedUpdates = { ...updates };
    if (processedUpdates.dueDate && typeof processedUpdates.dueDate === 'string') {
      processedUpdates.dueDate = new Date(processedUpdates.dueDate);
    }
    
    const [workOrder] = await db
      .update(workOrders)
      .set({ ...processedUpdates, updatedAt: new Date() })
      .where(eq(workOrders.id, id))
      .returning();
    return workOrder;
  }

  async deleteWorkOrder(id: string): Promise<void> {
    // Delete in correct order to handle foreign key constraints
    // 1. Delete time entries for this work order
    await db.delete(timeEntries).where(eq(timeEntries.workOrderId, id));
    
    // 2. Delete work order tasks for this work order
    await db.delete(workOrderTasks).where(eq(workOrderTasks.workOrderId, id));
    
    // 3. Delete work order issues for this work order
    await db.delete(workOrderIssues).where(eq(workOrderIssues.workOrderId, id));
    
    // 4. Update messages to remove work order reference (set to null instead of deleting)
    await db.update(messages)
      .set({ workOrderId: null })
      .where(eq(messages.workOrderId, id));
    
    // 5. Finally delete the work order itself
    await db.delete(workOrders).where(eq(workOrders.id, id));
  }

  // Time Entry operations
  async createTimeEntry(timeEntryData: InsertTimeEntry): Promise<TimeEntry> {
    const [timeEntry] = await db.insert(timeEntries).values(timeEntryData).returning();
    return timeEntry;
  }

  async getActiveTimeEntry(userId: string): Promise<any> {
    const [activeEntry] = await db
      .select({
        id: timeEntries.id,
        userId: timeEntries.userId,
        workOrderId: timeEntries.workOrderId,
        startTime: timeEntries.startTime,
        endTime: timeEntries.endTime,
        breakDuration: timeEntries.breakDuration,
        notes: timeEntries.notes,
        isActive: timeEntries.isActive,
        createdAt: timeEntries.createdAt,
        updatedAt: timeEntries.updatedAt,
        workOrderTitle: workOrders.title,
      })
      .from(timeEntries)
      .leftJoin(workOrders, eq(timeEntries.workOrderId, workOrders.id))
      .where(and(eq(timeEntries.userId, userId), eq(timeEntries.isActive, true)));
    return activeEntry;
  }

  async getAllActiveTimeEntries(): Promise<TimeEntry[]> {
    return await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.isActive, true))
      .orderBy(desc(timeEntries.startTime));
  }

  async getTimeEntriesByUser(userId: string): Promise<TimeEntry[]> {
    return await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.userId, userId))
      .orderBy(desc(timeEntries.createdAt));
  }

  async getTimeEntriesByWorkOrder(workOrderId: string): Promise<TimeEntry[]> {
    return await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.workOrderId, workOrderId))
      .orderBy(desc(timeEntries.createdAt));
  }

  async updateTimeEntry(id: string, updates: Partial<InsertTimeEntry>): Promise<TimeEntry> {
    const [timeEntry] = await db
      .update(timeEntries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(timeEntries.id, id))
      .returning();
    return timeEntry;
  }

  async endTimeEntry(id: string, endTime: Date): Promise<TimeEntry> {
    const [timeEntry] = await db
      .update(timeEntries)
      .set({ endTime, isActive: false, updatedAt: new Date() })
      .where(eq(timeEntries.id, id))
      .returning();
    return timeEntry;
  }

  // Message operations
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(messageData).returning();
    return message;
  }

  async getMessagesByRecipient(recipientId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(or(eq(messages.recipientId, recipientId), isNull(messages.recipientId)))
      .orderBy(desc(messages.createdAt));
  }

  async getMessagesBySender(senderId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.senderId, senderId))
      .orderBy(desc(messages.createdAt));
  }

  async getMessagesForWorkOrder(workOrderId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.workOrderId, workOrderId))
      .orderBy(desc(messages.createdAt));
  }

  async markMessageAsRead(id: string): Promise<Message> {
    const [message] = await db
      .update(messages)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id));
    return message;
  }

  async getAllMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async getUserMessages(userId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.recipientId, userId)))
      .orderBy(desc(messages.createdAt));
  }



  async getDashboardStats(companyId?: string) {
    // Apply company filter if provided
    const companyFilter = companyId ? eq(users.companyId, companyId) : undefined;
    
    // Get total users count (filtered by company if applicable)
    const totalUsersResult = companyFilter 
      ? await db.select({ count: count() }).from(users).where(companyFilter)
      : await db.select({ count: count() }).from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get work order counts (for now, work orders are not company-specific, but could be filtered later)
    const totalOrdersResult = await db.select({ count: count() }).from(workOrders);
    const totalOrders = totalOrdersResult[0]?.count || 0;

    const completedOrdersResult = await db.select({ count: count() }).from(workOrders).where(eq(workOrders.status, 'completed'));
    const completedOrders = completedOrdersResult[0]?.count || 0;

    const activeOrdersResult = await db.select({ count: count() }).from(workOrders).where(or(eq(workOrders.status, 'pending'), eq(workOrders.status, 'in_progress')));
    const activeOrders = activeOrdersResult[0]?.count || 0;

    // Get user role counts (filtered by company if applicable)
    const adminCountResult = companyFilter 
      ? await db.select({ count: count() }).from(users).where(and(sql`'administrator' = ANY(${users.roles})`, companyFilter))
      : await db.select({ count: count() }).from(users).where(sql`'administrator' = ANY(${users.roles})`);
    const adminCount = adminCountResult[0]?.count || 0;

    const managerCountResult = companyFilter 
      ? await db.select({ count: count() }).from(users).where(and(sql`'manager' = ANY(${users.roles})`, companyFilter))
      : await db.select({ count: count() }).from(users).where(sql`'manager' = ANY(${users.roles})`);
    const managerCount = managerCountResult[0]?.count || 0;

    const dispatcherCountResult = companyFilter 
      ? await db.select({ count: count() }).from(users).where(and(sql`'dispatcher' = ANY(${users.roles})`, companyFilter))
      : await db.select({ count: count() }).from(users).where(sql`'dispatcher' = ANY(${users.roles})`);
    const dispatcherCount = dispatcherCountResult[0]?.count || 0;

    const agentCountResult = companyFilter 
      ? await db.select({ count: count() }).from(users).where(and(sql`'field_agent' = ANY(${users.roles})`, companyFilter))
      : await db.select({ count: count() }).from(users).where(sql`'field_agent' = ANY(${users.roles})`);
    const agentCount = agentCountResult[0]?.count || 0;

    const clientCountResult = companyFilter 
      ? await db.select({ count: count() }).from(users).where(and(sql`'client' = ANY(${users.roles})`, companyFilter))
      : await db.select({ count: count() }).from(users).where(sql`'client' = ANY(${users.roles})`);
    const clientCount = clientCountResult[0]?.count || 0;

    return {
      totalUsers,
      activeOrders,
      completedOrders,
      totalOrders,
      adminCount,
      managerCount,
      dispatcherCount,
      agentCount,
      clientCount,
    };
  }

  async getTeamReports() {
    // Agent Performance - work orders completed, average time, efficiency
    const agentPerformance = await db
      .select({
        agentId: users.id,
        agentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        email: users.email,
        totalAssigned: count(workOrders.id),
        completedOrders: sum(sql<number>`CASE WHEN ${workOrders.status} = 'completed' THEN 1 ELSE 0 END`),
        avgEstimatedHours: avg(workOrders.estimatedHours),
        avgActualHours: avg(workOrders.actualHours),
      })
      .from(users)
      .leftJoin(workOrders, eq(users.id, workOrders.assigneeId))
      .where(sql`'field_agent' = ANY(${users.roles})`)
      .groupBy(users.id, users.firstName, users.lastName, users.email);

    // Work Order Statistics by Status
    const workOrderStats = await db
      .select({
        status: workOrders.status,
        count: count(),
        avgEstimatedHours: avg(workOrders.estimatedHours),
        avgActualHours: avg(workOrders.actualHours),
      })
      .from(workOrders)
      .groupBy(workOrders.status);

    // Time Tracking Statistics
    const timeTrackingStats = await db
      .select({
        totalEntries: count(),
        totalHoursWorked: sum(sql<number>`EXTRACT(EPOCH FROM (${timeEntries.endTime} - ${timeEntries.startTime}))/3600`),
        avgSessionLength: avg(sql<number>`EXTRACT(EPOCH FROM (${timeEntries.endTime} - ${timeEntries.startTime}))/3600`),
        activeEntries: sum(sql<number>`CASE WHEN ${timeEntries.isActive} = true THEN 1 ELSE 0 END`),
      })
      .from(timeEntries)
      .where(isNotNull(timeEntries.endTime));

    // Completion Rates by Agent
    const completionRates = await db
      .select({
        agentId: users.id,
        agentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        totalAssigned: count(workOrders.id),
        completed: sum(sql<number>`CASE WHEN ${workOrders.status} = 'completed' THEN 1 ELSE 0 END`),
        completionRate: sql<number>`ROUND(COALESCE(SUM(CASE WHEN ${workOrders.status} = 'completed' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(${workOrders.id}), 0), 0), 2)`,
      })
      .from(users)
      .leftJoin(workOrders, eq(users.id, workOrders.assigneeId))
      .where(sql`'field_agent' = ANY(${users.roles})`)
      .groupBy(users.id, users.firstName, users.lastName);

    // Monthly Trends (last 6 months)
    const monthlyTrends = await db
      .select({
        month: sql<string>`TO_CHAR(${workOrders.createdAt}, 'YYYY-MM')`,
        created: count(),
        completed: sum(sql<number>`CASE WHEN ${workOrders.status} = 'completed' THEN 1 ELSE 0 END`),
      })
      .from(workOrders)
      .where(sql`${workOrders.createdAt} >= CURRENT_DATE - INTERVAL '6 months'`)
      .groupBy(sql`TO_CHAR(${workOrders.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${workOrders.createdAt}, 'YYYY-MM')`);

    return {
      agentPerformance,
      workOrderStats,
      timeTrackingStats: timeTrackingStats[0] || {
        totalEntries: 0,
        totalHoursWorked: 0,
        avgSessionLength: 0,
        activeEntries: 0,
      },
      completionRates,
      monthlyTrends,
    };
  }

  // Work Order Task operations
  async getWorkOrderTask(id: string): Promise<WorkOrderTask | undefined> {
    const [task] = await db.select().from(workOrderTasks).where(eq(workOrderTasks.id, id));
    return task;
  }

  async createWorkOrderTask(taskData: InsertWorkOrderTask): Promise<WorkOrderTask> {
    const [task] = await db.insert(workOrderTasks).values(taskData).returning();
    return task;
  }

  async getWorkOrderTasks(workOrderId: string): Promise<WorkOrderTask[]> {
    return await db
      .select()
      .from(workOrderTasks)
      .where(eq(workOrderTasks.workOrderId, workOrderId))
      .orderBy(workOrderTasks.category, workOrderTasks.orderIndex);
  }

  async updateWorkOrderTask(id: string, updates: Partial<InsertWorkOrderTask>): Promise<WorkOrderTask> {
    const [task] = await db
      .update(workOrderTasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workOrderTasks.id, id))
      .returning();
    return task;
  }

  async deleteWorkOrderTask(id: string): Promise<void> {
    await db.delete(workOrderTasks).where(eq(workOrderTasks.id, id));
  }

  // Status and time tracking operations
  async updateWorkOrderStatus(id: string, updateData: any): Promise<WorkOrder> {
    const [workOrder] = await db
      .update(workOrders)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(workOrders.id, id))
      .returning();
    return workOrder;
  }

  async updateAssignmentProgressStatus(id: string, status: string): Promise<WorkOrder> {
    const [workOrder] = await db
      .update(workOrders)
      .set({
        assignmentProgressStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(workOrders.id, id))
      .returning();
    return workOrder;
  }

  async scheduleWorkOrder(id: string): Promise<WorkOrder> {
    const [workOrder] = await db
      .update(workOrders)
      .set({
        isScheduled: true,
        updatedAt: new Date(),
      })
      .where(eq(workOrders.id, id))
      .returning();
    return workOrder;
  }

  async startTimeEntry(userId: string, workOrderId: string): Promise<TimeEntry> {
    // End any active time entries for this user first
    await this.endActiveTimeEntry(userId, workOrderId);
    
    const timeEntryData = {
      id: `time-${Date.now()}`,
      userId,
      workOrderId,
      startTime: new Date(),
      isActive: true,
    };
    
    const [timeEntry] = await db
      .insert(timeEntries)
      .values(timeEntryData)
      .returning();
    return timeEntry;
  }

  async endActiveTimeEntry(userId: string, workOrderId: string): Promise<TimeEntry | null> {
    const activeEntry = await this.getActiveTimeEntry(userId);
    if (!activeEntry) return null;

    const [timeEntry] = await db
      .update(timeEntries)
      .set({
        endTime: new Date(),
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(timeEntries.id, activeEntry.id), eq(timeEntries.isActive, true)))
      .returning();
    
    return timeEntry || null;
  }

  async markTaskComplete(taskId: string, userId: string): Promise<WorkOrderTask> {
    const [task] = await db
      .update(workOrderTasks)
      .set({
        isCompleted: true,
        completedById: userId,
        completedAt: new Date(),
      })
      .where(eq(workOrderTasks.id, taskId))
      .returning();
    return task;
  }

  // Work Order Issue operations
  async getWorkOrderIssues(workOrderId: string): Promise<WorkOrderIssue[]> {
    return await db
      .select()
      .from(workOrderIssues)
      .where(eq(workOrderIssues.workOrderId, workOrderId))
      .orderBy(desc(workOrderIssues.createdAt));
  }

  async createWorkOrderIssue(issueData: InsertWorkOrderIssue): Promise<WorkOrderIssue> {
    const [issue] = await db
      .insert(workOrderIssues)
      .values(issueData)
      .returning();
    return issue;
  }

  async getAllIssues(): Promise<WorkOrderIssue[]> {
    return await db
      .select()
      .from(workOrderIssues)
      .orderBy(desc(workOrderIssues.createdAt));
  }

  // Structured Issue operations
  async getStructuredIssues(workOrderId?: string): Promise<StructuredIssue[]> {
    const query = db
      .select({
        id: structuredIssues.id,
        workOrderId: structuredIssues.workOrderId,
        reporterId: structuredIssues.reporterId,
        type: structuredIssues.type,
        description: structuredIssues.description,
        severity: structuredIssues.severity,
        status: structuredIssues.status,
        attachments: structuredIssues.attachments,
        reviewedById: structuredIssues.reviewedById,
        reviewedAt: structuredIssues.reviewedAt,
        resolution: structuredIssues.resolution,
        createdAt: structuredIssues.createdAt,
        updatedAt: structuredIssues.updatedAt,
        reporter: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        workOrder: {
          title: workOrders.title,
          location: workOrders.location,
        }
      })
      .from(structuredIssues)
      .leftJoin(users, eq(structuredIssues.reporterId, users.id))
      .leftJoin(workOrders, eq(structuredIssues.workOrderId, workOrders.id));
    
    if (workOrderId) {
      query.where(eq(structuredIssues.workOrderId, workOrderId));
    }
    
    return query.orderBy(desc(structuredIssues.createdAt));
  }

  async createStructuredIssue(issueData: InsertStructuredIssue): Promise<StructuredIssue> {
    const [issue] = await db
      .insert(structuredIssues)
      .values(issueData)
      .returning();
    return issue;
  }

  async updateStructuredIssue(id: string, updates: Partial<InsertStructuredIssue>): Promise<StructuredIssue> {
    const [issue] = await db
      .update(structuredIssues)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(structuredIssues.id, id))
      .returning();
    return issue;
  }

  async getStructuredIssueById(id: string): Promise<StructuredIssue | null> {
    const [issue] = await db
      .select()
      .from(structuredIssues)
      .where(eq(structuredIssues.id, id));
    return issue || null;
  }

  async getStructuredIssue(id: string): Promise<StructuredIssue | undefined> {
    const [issue] = await db
      .select()
      .from(structuredIssues)
      .where(eq(structuredIssues.id, id));
    return issue;
  }

  // Audit Log operations
  async createAuditLog(auditLogData: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db
      .insert(auditLogs)
      .values(auditLogData)
      .returning();
    return auditLog;
  }

  async getAuditLogsByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const logs = await db
      .select({
        id: auditLogs.id,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        action: auditLogs.action,
        performedBy: auditLogs.performedBy,
        previousState: auditLogs.previousState,
        newState: auditLogs.newState,
        reason: auditLogs.reason,
        metadata: auditLogs.metadata,
        timestamp: auditLogs.timestamp,
        performer: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.performedBy, users.id))
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
      .orderBy(desc(auditLogs.timestamp));
    
    return logs as AuditLog[];
  }

  async getAuditLogsByUser(userId: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.performedBy, userId))
      .orderBy(desc(auditLogs.timestamp));
  }

  async getAllAuditLogs(limit = 100, offset = 0): Promise<AuditLog[]> {
    const logs = await db
      .select({
        id: auditLogs.id,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        action: auditLogs.action,
        performedBy: auditLogs.performedBy,
        previousState: auditLogs.previousState,
        newState: auditLogs.newState,
        reason: auditLogs.reason,
        metadata: auditLogs.metadata,
        timestamp: auditLogs.timestamp,
        performer: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.performedBy, users.id))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);
    
    return logs as AuditLog[];
  }

  async getAuditLogsForAdmin(filters?: { entityType?: string; userId?: string; startDate?: Date; endDate?: Date }): Promise<AuditLog[]> {
    const conditions = [];
    
    if (filters?.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    
    if (filters?.userId) {
      conditions.push(eq(auditLogs.performedBy, filters.userId));
    }
    
    if (filters?.startDate) {
      conditions.push(sql`${auditLogs.timestamp} >= ${filters.startDate}`);
    }
    
    if (filters?.endDate) {
      conditions.push(sql`${auditLogs.timestamp} <= ${filters.endDate}`);
    }

    const logs = await db
      .select({
        id: auditLogs.id,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        action: auditLogs.action,
        performedBy: auditLogs.performedBy,
        previousState: auditLogs.previousState,
        newState: auditLogs.newState,
        reason: auditLogs.reason,
        metadata: auditLogs.metadata,
        timestamp: auditLogs.timestamp,
        performer: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.performedBy, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.timestamp))
      .limit(200);
    
    return logs as AuditLog[];
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(notificationData).returning();
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .orderBy(desc(notifications.createdAt));
  }

  async updateNotification(id: string, updates: Partial<InsertNotification>): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set(updates)
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  async confirmWorkOrderNotification(notificationId: string, workOrderId: string): Promise<WorkOrder> {
    // Mark notification as confirmed and read
    await db
      .update(notifications)
      .set({
        isConfirmed: true,
        isRead: true,
        confirmedAt: new Date(),
      })
      .where(eq(notifications.id, notificationId));

    // Update work order status to confirmed
    const [workOrder] = await db
      .update(workOrders)
      .set({
        status: 'confirmed',
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workOrders.id, workOrderId))
      .returning();

    return workOrder;
  }

  // Get real company statistics
  async getCompanyStats(companyId: string): Promise<{
    onboardedUsers: number;
    activeWorkOrders: number;
    completedWorkOrders: number;
    successRate: number;
  }> {
    // Get users count for this company
    const usersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.companyId, companyId));
    const onboardedUsers = usersResult[0]?.count || 0;

    // Get active work orders count for this company
    const activeOrdersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(workOrders)
      .where(and(
        eq(workOrders.companyId, companyId),
        sql`status IN ('scheduled', 'confirmed', 'in_progress', 'in_route', 'checked_in')`
      ));
    const activeWorkOrders = activeOrdersResult[0]?.count || 0;

    // Get completed work orders count for this company
    const completedOrdersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(workOrders)
      .where(and(
        eq(workOrders.companyId, companyId),
        eq(workOrders.status, 'completed')
      ));
    const completedWorkOrders = completedOrdersResult[0]?.count || 0;

    // Calculate success rate (completed / total orders)
    const totalOrders = activeWorkOrders + completedWorkOrders;
    const successRate = totalOrders > 0 ? Math.round((completedWorkOrders / totalOrders) * 100) : 0;

    return {
      onboardedUsers,
      activeWorkOrders,
      completedWorkOrders,
      successRate,
    };
  }

  // Client management and job network operations
  async getClientWorkOrders(clientId: string): Promise<WorkOrder[]> {
    return await db
      .select({
        ...workOrders,
        assignedAgent: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(workOrders)
      .leftJoin(users, eq(workOrders.assigneeId, users.id))
      .where(eq(workOrders.createdById, clientId))
      .orderBy(desc(workOrders.createdAt));
  }

  async getJobNetworkWorkOrders(): Promise<WorkOrder[]> {
    return await db
      .select({
        ...workOrders,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          clientCompanyName: users.clientCompanyName
        },
        requestedAgent: sql`CASE 
          WHEN requested_agent_id IS NOT NULL THEN 
            json_build_object(
              'id', ra.id,
              'firstName', ra.first_name,
              'lastName', ra.last_name
            )
          ELSE NULL
        END`.as('requestedAgent')
      })
      .from(workOrders)
      .leftJoin(users, eq(workOrders.createdById, users.id))
      .leftJoin(sql`users ra`, sql`ra.id = work_orders.requested_agent_id`)
      .where(eq(workOrders.isClientCreated, true))
      .orderBy(desc(workOrders.createdAt));
  }

  async getClientAssignmentRequests(clientId: string): Promise<any[]> {
    // Get work orders created by this client that have assignment requests
    const requests = await db
      .select({
        id: workOrders.id,
        workOrderId: workOrders.id,
        workOrder: {
          title: workOrders.title,
          description: workOrders.description
        },
        requestedAgent: sql`json_build_object(
          'id', ra.id,
          'firstName', ra.first_name,
          'lastName', ra.last_name
        )`.as('requestedAgent'),
        requestedBy: sql`json_build_object(
          'firstName', rb.first_name,
          'lastName', rb.last_name
        )`.as('requestedBy'),
        requestedAt: workOrders.requestedAt,
        performance: sql`COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', ap.id,
              'completionSuccess', ap.completion_success,
              'timeliness', ap.timeliness,
              'issuesReported', ap.issues_reported,
              'clientRating', ap.client_rating,
              'clientFeedback', ap.client_feedback,
              'createdAt', ap.created_at
            )
          ) FROM agent_performance ap WHERE ap.agent_id = work_orders.requested_agent_id AND ap.client_id = work_orders.created_by_id),
          '[]'::json
        )`.as('performance')
      })
      .from(workOrders)
      .leftJoin(sql`users ra`, sql`ra.id = work_orders.requested_agent_id`)
      .leftJoin(sql`users rb`, sql`rb.id = work_orders.requested_by_id`)
      .where(and(
        eq(workOrders.createdById, clientId),
        eq(workOrders.requestStatus, 'request_sent')
      ))
      .orderBy(desc(workOrders.requestedAt));

    return requests;
  }

  async respondToAssignmentRequest(
    requestId: string, 
    action: 'accept' | 'decline', 
    notes: string, 
    clientId: string
  ): Promise<any> {
    const status = action === 'accept' ? 'request_accepted' : 'request_declined';
    
    // Update the work order with the response
    const [updatedWorkOrder] = await db
      .update(workOrders)
      .set({
        requestStatus: status,
        requestReviewedAt: new Date(),
        clientNotes: notes,
        // If accepted, assign the requested agent
        ...(action === 'accept' && { assigneeId: sql`requested_agent_id` }),
        updatedAt: new Date()
      })
      .where(and(
        eq(workOrders.id, requestId),
        eq(workOrders.createdById, clientId)
      ))
      .returning();

    return updatedWorkOrder;
  }

  async requestWorkOrderAssignment(
    workOrderId: string, 
    agentId: string, 
    requestedById: string, 
    notes?: string
  ): Promise<any> {
    // Update work order with assignment request details
    const [updatedWorkOrder] = await db
      .update(workOrders)
      .set({
        requestStatus: 'request_sent',
        requestedAgentId: agentId,
        requestedById: requestedById,
        requestedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(workOrders.id, workOrderId))
      .returning();

    return updatedWorkOrder;
  }

  async assignWorkOrderAgent(workOrderId: string, assigneeId: string): Promise<WorkOrder> {
    // Direct assignment - update work order with assignee
    const [updatedWorkOrder] = await db
      .update(workOrders)
      .set({
        assigneeId: assigneeId,
        requestStatus: null,
        requestedAgentId: null,
        requestedById: null,
        requestedAt: null,
        updatedAt: new Date()
      })
      .where(eq(workOrders.id, workOrderId))
      .returning();

    return updatedWorkOrder;
  }

  // Work Order Request operations
  async createWorkOrderRequest(request: InsertWorkOrderRequest): Promise<WorkOrderRequest> {
    const [newRequest] = await db
      .insert(workOrderRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async getWorkOrderRequestsByClient(clientCompanyId: string): Promise<WorkOrderRequest[]> {
    return await db
      .select({
        ...workOrderRequests,
        requestingCompany: {
          id: companies.id,
          name: companies.name
        },
        requestedBy: {
          firstName: users.firstName,
          lastName: users.lastName
        },
        proposedAgent: sql`CASE 
          WHEN work_order_requests.proposed_agent_id IS NOT NULL THEN 
            json_build_object(
              'id', pa.id,
              'firstName', pa.first_name,
              'lastName', pa.last_name
            )
          ELSE NULL
        END`.as('proposedAgent')
      })
      .from(workOrderRequests)
      .leftJoin(companies, eq(workOrderRequests.requestingCompanyId, companies.id))
      .leftJoin(users, eq(workOrderRequests.requestedById, users.id))
      .leftJoin(sql`users pa`, sql`pa.id = work_order_requests.proposed_agent_id`)
      .where(eq(workOrderRequests.clientCompanyId, clientCompanyId))
      .orderBy(desc(workOrderRequests.createdAt));
  }

  async getWorkOrderRequestsByServiceCompany(serviceCompanyId: string): Promise<WorkOrderRequest[]> {
    return await db
      .select({
        ...workOrderRequests,
        clientCompany: {
          id: companies.id,
          name: companies.name
        },
        requestedBy: {
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(workOrderRequests)
      .leftJoin(companies, eq(workOrderRequests.clientCompanyId, companies.id))
      .leftJoin(users, eq(workOrderRequests.requestedById, users.id))
      .where(eq(workOrderRequests.requestingCompanyId, serviceCompanyId))
      .orderBy(desc(workOrderRequests.createdAt));
  }

  async respondToWorkOrderRequest(
    requestId: string, 
    status: 'approved' | 'declined', 
    reviewedById: string, 
    clientResponse?: string
  ): Promise<WorkOrderRequest> {
    const [updatedRequest] = await db
      .update(workOrderRequests)
      .set({
        status,
        reviewedById,
        reviewedAt: new Date(),
        clientResponse,
        updatedAt: new Date()
      })
      .where(eq(workOrderRequests.id, requestId))
      .returning();

    return updatedRequest;
  }

  async getJobNetworkPosts(): Promise<JobNetworkPost[]> {
    return await db
      .select({
        ...jobNetworkPosts,
        clientCompany: {
          id: companies.id,
          name: companies.name
        },
        postedBy: {
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(jobNetworkPosts)
      .leftJoin(companies, eq(jobNetworkPosts.clientCompanyId, companies.id))
      .leftJoin(users, eq(jobNetworkPosts.postedById, users.id))
      .where(eq(jobNetworkPosts.isPublic, true))
      .orderBy(desc(jobNetworkPosts.createdAt));
  }

  async getExclusiveNetworkPosts(): Promise<ExclusiveNetworkPost[]> {
    return await db
      .select({
        ...exclusiveNetworkPosts,
        clientCompany: {
          id: companies.id,
          name: companies.name
        },
        postedBy: {
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(exclusiveNetworkPosts)
      .leftJoin(companies, eq(exclusiveNetworkPosts.clientCompanyId, companies.id))
      .leftJoin(users, eq(exclusiveNetworkPosts.postedById, users.id))
      .orderBy(desc(exclusiveNetworkPosts.createdAt));
  }

  // Rating operations
  async createClientFieldAgentRating(rating: InsertClientFieldAgentRating): Promise<ClientFieldAgentRating> {
    const [newRating] = await db.insert(clientFieldAgentRatings).values(rating).returning();
    
    // Update field agent's average ratings
    await this.updateUserRatings(rating.fieldAgentId);
    await this.updateCompanyRatings(rating.companyId);
    
    return newRating;
  }

  async createClientDispatcherRating(rating: InsertClientDispatcherRating): Promise<ClientDispatcherRating> {
    const [newRating] = await db.insert(clientDispatcherRatings).values(rating).returning();
    
    // Update dispatcher's average ratings
    await this.updateUserRatings(rating.dispatcherId);
    await this.updateCompanyRatings(rating.companyId);
    
    return newRating;
  }

  async createServiceClientRating(rating: InsertServiceClientRating): Promise<ServiceClientRating> {
    const [newRating] = await db
      .insert(serviceClientRatings)
      .values(rating)
      .returning();
    return newRating;
  }

  async getClientFieldAgentRating(workOrderId: string, clientId: string): Promise<ClientFieldAgentRating | undefined> {
    const [rating] = await db
      .select()
      .from(clientFieldAgentRatings)
      .where(and(
        eq(clientFieldAgentRatings.workOrderId, workOrderId),
        eq(clientFieldAgentRatings.clientId, clientId)
      ));
    return rating;
  }

  async getClientDispatcherRating(workOrderId: string, clientId: string): Promise<ClientDispatcherRating | undefined> {
    const [rating] = await db
      .select()
      .from(clientDispatcherRatings)
      .where(and(
        eq(clientDispatcherRatings.workOrderId, workOrderId),
        eq(clientDispatcherRatings.clientId, clientId)
      ));
    return rating;
  }

  async getServiceClientRating(workOrderId: string, raterId: string): Promise<ServiceClientRating | undefined> {
    const [rating] = await db
      .select()
      .from(serviceClientRatings)
      .where(and(
        eq(serviceClientRatings.workOrderId, workOrderId),
        eq(serviceClientRatings.raterId, raterId)
      ));
    return rating;
  }

  async getFieldAgentRatings(fieldAgentId: string): Promise<ClientFieldAgentRating[]> {
    return await db
      .select()
      .from(clientFieldAgentRatings)
      .where(eq(clientFieldAgentRatings.fieldAgentId, fieldAgentId))
      .orderBy(desc(clientFieldAgentRatings.createdAt));
  }

  async getDispatcherRatings(dispatcherId: string): Promise<ClientDispatcherRating[]> {
    return await db
      .select()
      .from(clientDispatcherRatings)
      .where(eq(clientDispatcherRatings.dispatcherId, dispatcherId))
      .orderBy(desc(clientDispatcherRatings.createdAt));
  }

  async getClientRatings(clientId: string): Promise<ServiceClientRating[]> {
    return await db
      .select()
      .from(serviceClientRatings)
      .where(eq(serviceClientRatings.clientId, clientId))
      .orderBy(desc(serviceClientRatings.createdAt));
  }

  async updateUserRatings(userId: string): Promise<void> {
    // Calculate average ratings for field agent
    const fieldAgentRatings = await this.getFieldAgentRatings(userId);
    if (fieldAgentRatings.length > 0) {
      const avgCommunication = fieldAgentRatings.reduce((sum, r) => sum + r.communicationRating, 0) / fieldAgentRatings.length;
      const avgTimeliness = fieldAgentRatings.reduce((sum, r) => sum + r.timelinessRating, 0) / fieldAgentRatings.length;
      const avgWorkSatisfaction = fieldAgentRatings.reduce((sum, r) => sum + r.workSatisfactionRating, 0) / fieldAgentRatings.length;
      const overallRating = (avgCommunication + avgTimeliness + avgWorkSatisfaction) / 3;

      await db.update(users).set({
        communicationRating: avgCommunication.toFixed(2),
        timelinessRating: avgTimeliness.toFixed(2),
        workSatisfactionRating: avgWorkSatisfaction.toFixed(2),
        overallRating: overallRating.toFixed(2),
        totalRatings: fieldAgentRatings.length,
        updatedAt: new Date()
      }).where(eq(users.id, userId));
    }

    // Calculate average ratings for dispatcher
    const dispatcherRatings = await this.getDispatcherRatings(userId);
    if (dispatcherRatings.length > 0) {
      const avgCommunication = dispatcherRatings.reduce((sum, r) => sum + r.communicationRating, 0) / dispatcherRatings.length;
      const avgManagement = dispatcherRatings.reduce((sum, r) => sum + r.managementRating, 0) / dispatcherRatings.length;
      const avgFieldAgent = dispatcherRatings.reduce((sum, r) => sum + r.fieldAgentRating, 0) / dispatcherRatings.length;
      const overallRating = (avgCommunication + avgManagement + avgFieldAgent) / 3;

      await db.update(users).set({
        communicationRating: avgCommunication.toFixed(2),
        managementRating: avgManagement.toFixed(2),
        fieldAgentRating: avgFieldAgent.toFixed(2),
        overallRating: overallRating.toFixed(2),
        totalRatings: dispatcherRatings.length,
        updatedAt: new Date()
      }).where(eq(users.id, userId));
    }

    // Calculate client ratings
    const clientRatings = await this.getClientRatings(userId);
    if (clientRatings.length > 0) {
      const avgCommunication = clientRatings.reduce((sum, r) => sum + r.communicationRating, 0) / clientRatings.length;
      const avgClearScope = clientRatings.reduce((sum, r) => sum + r.clearScopeRating, 0) / clientRatings.length;
      const avgOverallSatisfaction = clientRatings.reduce((sum, r) => sum + r.overallSatisfactionRating, 0) / clientRatings.length;
      const overallRating = (avgCommunication + avgClearScope + avgOverallSatisfaction) / 3;

      await db.update(users).set({
        communicationRating: avgCommunication.toFixed(2),
        clearScopeRating: avgClearScope.toFixed(2),
        overallSatisfactionRating: avgOverallSatisfaction.toFixed(2),
        overallRating: overallRating.toFixed(2),
        totalRatings: clientRatings.length,
        updatedAt: new Date()
      }).where(eq(users.id, userId));
    }
  }

  async updateCompanyRatings(companyId: string): Promise<void> {
    // Get all users from this company with ratings
    const companyUsers = await db.select().from(users).where(eq(users.companyId, companyId));
    const usersWithRatings = companyUsers.filter(user => user.totalRatings && user.totalRatings > 0);
    
    if (usersWithRatings.length > 0) {
      const totalRatingSum = usersWithRatings.reduce((sum, user) => sum + (user.overallRating || 0), 0);
      const totalRatingsCount = usersWithRatings.reduce((sum, user) => sum + (user.totalRatings || 0), 0);
      const avgRating = totalRatingSum / usersWithRatings.length;

      await db.update(companies).set({
        overallRating: avgRating.toFixed(2),
        totalRatings: totalRatingsCount,
        updatedAt: new Date()
      }).where(eq(companies.id, companyId));
    }
  }

  // Feedback operations (Client Feedback Loop)
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db
      .insert(feedback)
      .values(feedbackData)
      .returning();
    return newFeedback;
  }

  async getFeedbackByWorkOrder(workOrderId: string): Promise<Feedback | undefined> {
    const [feedbackRecord] = await db
      .select()
      .from(feedback)
      .where(eq(feedback.workOrderId, workOrderId));
    return feedbackRecord;
  }

  async getFeedbackByAgent(agentId: string): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedback)
      .where(eq(feedback.givenTo, agentId))
      .orderBy(desc(feedback.createdAt));
  }

  async getAllFeedback(filters: {
    companyId?: string;
    stars?: number;
    dateFrom?: string;
    dateTo?: string;
    agentId?: string;
    limit: number;
    offset: number;
  }): Promise<Feedback[]> {
    const conditions = [];

    if (filters.companyId) {
      // Join with feedback to check company relationship
      const feedbackJoin = leftJoin(feedback, eq(feedback.workOrderId, workOrders.id));
      conditions.push(eq(workOrders.companyId, filters.companyId));
    }

    if (filters.stars) {
      conditions.push(eq(feedback.stars, filters.stars));
    }

    if (filters.agentId) {
      conditions.push(eq(feedback.givenTo, filters.agentId));
    }

    if (filters.dateFrom) {
      conditions.push(sql`${feedback.createdAt} >= ${new Date(filters.dateFrom)}`);
    }

    if (filters.dateTo) {
      conditions.push(sql`${feedback.createdAt} <= ${new Date(filters.dateTo)}`);
    }

    let query = db
      .select()
      .from(feedback)
      .leftJoin(workOrders, eq(feedback.workOrderId, workOrders.id))
      .leftJoin(companies, eq(workOrders.companyId, companies.id))
      .leftJoin(users, eq(feedback.givenTo, users.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query
      .orderBy(desc(feedback.createdAt))
      .limit(filters.limit)
      .offset(filters.offset);
  }

  // Performance Analytics operations
  async createPerformanceSnapshot(snapshot: InsertPerformanceSnapshot): Promise<PerformanceSnapshot> {
    const [newSnapshot] = await db
      .insert(performanceSnapshots)
      .values(snapshot)
      .returning();
    return newSnapshot;
  }

  async getPerformanceSnapshots(agentId: string, limit: number = 10): Promise<PerformanceSnapshot[]> {
    return await db
      .select()
      .from(performanceSnapshots)
      .where(eq(performanceSnapshots.agentId, agentId))
      .orderBy(desc(performanceSnapshots.createdAt))
      .limit(limit);
  }

  async calculateAgentPerformanceMetrics(agentId: string, dateFrom?: string, dateTo?: string): Promise<any> {
    const conditions = [eq(workOrders.assignedAgent, agentId)];
    
    if (dateFrom) {
      conditions.push(sql`${workOrders.createdAt} >= ${new Date(dateFrom)}`);
    }
    
    if (dateTo) {
      conditions.push(sql`${workOrders.createdAt} <= ${new Date(dateTo)}`);
    }

    // Get work order completion stats
    const completedWorkOrders = await db
      .select({
        id: workOrders.id,
        status: workOrders.status,
        scheduledStart: workOrders.scheduledStart,
        actualStart: workOrders.actualStart,
        scheduledEnd: workOrders.scheduledEnd,
        completedAt: workOrders.completedAt,
        estimatedHours: workOrders.estimatedHours,
        actualHours: workOrders.actualHours,
        createdAt: workOrders.createdAt
      })
      .from(workOrders)
      .where(and(...conditions))
      .orderBy(desc(workOrders.createdAt));

    const totalJobs = completedWorkOrders.length;
    const completedJobs = completedWorkOrders.filter(wo => wo.status === 'completed').length;
    
    // Calculate average completion time
    const completedWithActualHours = completedWorkOrders.filter(wo => wo.actualHours && wo.status === 'completed');
    const avgCompletionTime = completedWithActualHours.length > 0 
      ? completedWithActualHours.reduce((sum, wo) => sum + (wo.actualHours || 0), 0) / completedWithActualHours.length 
      : 0;

    // Calculate on-time performance
    const onTimeStarts = completedWorkOrders.filter(wo => {
      if (!wo.scheduledStart || !wo.actualStart) return false;
      return new Date(wo.actualStart) <= new Date(wo.scheduledStart);
    }).length;

    const onTimeFinishes = completedWorkOrders.filter(wo => {
      if (!wo.scheduledEnd || !wo.completedAt) return false;
      return new Date(wo.completedAt) <= new Date(wo.scheduledEnd);
    }).length;

    const onTimeStartPercentage = totalJobs > 0 ? (onTimeStarts / totalJobs) * 100 : 0;
    const onTimeFinishPercentage = totalJobs > 0 ? (onTimeFinishes / totalJobs) * 100 : 0;

    // Get feedback ratings
    const feedbackRatings = await db
      .select({
        stars: feedback.stars,
        categoryScores: feedback.categoryScores,
        wouldHireAgain: feedback.wouldHireAgain,
        createdAt: feedback.createdAt
      })
      .from(feedback)
      .where(eq(feedback.givenTo, agentId))
      .orderBy(desc(feedback.createdAt));

    const avgStarRating = feedbackRatings.length > 0 
      ? feedbackRatings.reduce((sum, rating) => sum + rating.stars, 0) / feedbackRatings.length 
      : 0;

    const wouldHireAgainCount = feedbackRatings.filter(rating => rating.wouldHireAgain === true).length;
    const wouldHireAgainPercentage = feedbackRatings.length > 0 
      ? (wouldHireAgainCount / feedbackRatings.length) * 100 
      : 0;

    // Get issues count
    const issuesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(structuredIssues)
      .innerJoin(workOrders, eq(structuredIssues.workOrderId, workOrders.id))
      .where(and(eq(workOrders.assignedAgent, agentId), ...conditions.slice(1)));

    const totalIssues = issuesCount[0]?.count || 0;

    // Get resolved issues count
    const resolvedIssuesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(structuredIssues)
      .innerJoin(workOrders, eq(structuredIssues.workOrderId, workOrders.id))
      .where(and(
        eq(workOrders.assignedAgent, agentId), 
        eq(structuredIssues.status, 'resolved'),
        ...conditions.slice(1)
      ));

    const resolvedIssues = resolvedIssuesCount[0]?.count || 0;
    const issueResolutionRate = totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0;

    // Calculate audit trail compliance score (based on required log events)
    const auditLogs = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(and(eq(auditLogs.performedBy, agentId), ...conditions.slice(1)));

    const auditLogCount = auditLogs[0]?.count || 0;
    
    // Compliance score: number of audit logs per completed job (higher is better)
    const complianceScore = completedJobs > 0 ? (auditLogCount / completedJobs) : 0;

    return {
      agentId,
      totalJobs,
      completedJobs,
      avgCompletionTime: Math.round(avgCompletionTime * 100) / 100,
      onTimeStartPercentage: Math.round(onTimeStartPercentage * 100) / 100,
      onTimeFinishPercentage: Math.round(onTimeFinishPercentage * 100) / 100,
      avgStarRating: Math.round(avgStarRating * 100) / 100,
      totalFeedback: feedbackRatings.length,
      wouldHireAgainPercentage: Math.round(wouldHireAgainPercentage * 100) / 100,
      totalIssues,
      resolvedIssues,
      issueResolutionRate: Math.round(issueResolutionRate * 100) / 100,
      complianceScore: Math.round(complianceScore * 100) / 100,
      dateRange: {
        from: dateFrom || null,
        to: dateTo || null
      }
    };
  }

  // Service Quality operations
  async createServiceQualitySnapshot(snapshot: InsertServiceQualitySnapshot): Promise<ServiceQualitySnapshot> {
    const [newSnapshot] = await db
      .insert(serviceQualitySnapshots)
      .values(snapshot)
      .returning();
    return newSnapshot;
  }

  async getServiceQualitySnapshots(companyId: string, limit: number = 10): Promise<ServiceQualitySnapshot[]> {
    return await db
      .select()
      .from(serviceQualitySnapshots)
      .where(eq(serviceQualitySnapshots.companyId, companyId))
      .orderBy(desc(serviceQualitySnapshots.createdAt))
      .limit(limit);
  }

  async calculateServiceQualityMetrics(companyId: string, dateFrom?: string, dateTo?: string): Promise<any> {
    const conditions = [eq(workOrders.companyId, companyId)];
    
    if (dateFrom) {
      conditions.push(sql`${workOrders.createdAt} >= ${new Date(dateFrom)}`);
    }
    
    if (dateTo) {
      conditions.push(sql`${workOrders.createdAt} <= ${new Date(dateTo)}`);
    }

    // Get all work orders for the company in the specified period
    const companyWorkOrders = await db
      .select({
        id: workOrders.id,
        status: workOrders.status,
        assignedAgent: workOrders.assignedAgent,
        scheduledStart: workOrders.scheduledStart,
        actualStart: workOrders.actualStart,
        scheduledEnd: workOrders.scheduledEnd,
        completedAt: workOrders.completedAt,
        estimatedHours: workOrders.estimatedHours,
        actualHours: workOrders.actualHours,
        createdAt: workOrders.createdAt
      })
      .from(workOrders)
      .where(and(...conditions))
      .orderBy(desc(workOrders.createdAt));

    const totalJobs = companyWorkOrders.length;
    const completedJobs = companyWorkOrders.filter(wo => wo.status === 'completed').length;

    // Calculate job volume trends by day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentJobs = companyWorkOrders.filter(wo => 
      new Date(wo.createdAt) >= thirtyDaysAgo
    );

    const jobVolumeByDay = new Map();
    recentJobs.forEach(job => {
      const dayKey = new Date(job.createdAt).toISOString().split('T')[0];
      jobVolumeByDay.set(dayKey, (jobVolumeByDay.get(dayKey) || 0) + 1);
    });

    // Calculate timeliness metrics
    const onTimeStarts = companyWorkOrders.filter(wo => {
      if (!wo.scheduledStart || !wo.actualStart) return false;
      return new Date(wo.actualStart) <= new Date(wo.scheduledStart);
    }).length;

    const onTimeFinishes = companyWorkOrders.filter(wo => {
      if (!wo.scheduledEnd || !wo.completedAt) return false;
      return new Date(wo.completedAt) <= new Date(wo.scheduledEnd);
    }).length;

    const onTimeStartPercentage = totalJobs > 0 ? (onTimeStarts / totalJobs) * 100 : 0;
    const onTimeFinishPercentage = totalJobs > 0 ? (onTimeFinishes / totalJobs) * 100 : 0;
    const serviceComplianceScore = (onTimeStartPercentage + onTimeFinishPercentage) / 2;

    // Get feedback data for all agents in this company
    const companyUsers = await db.select().from(users).where(eq(users.companyId, companyId));
    const agentIds = companyUsers.map(user => user.id);

    let totalFeedback = 0;
    let totalStarsSum = 0;
    let wouldHireAgainCount = 0;

    if (agentIds.length > 0) {
      const feedbackData = await db
        .select({
          stars: feedback.stars,
          wouldHireAgain: feedback.wouldHireAgain,
          createdAt: feedback.createdAt
        })
        .from(feedback)
        .where(sql`${feedback.givenTo} = ANY(${agentIds})`);

      // Filter by date range if specified
      const filteredFeedback = feedbackData.filter(f => {
        if (dateFrom && new Date(f.createdAt) < new Date(dateFrom)) return false;
        if (dateTo && new Date(f.createdAt) > new Date(dateTo)) return false;
        return true;
      });

      totalFeedback = filteredFeedback.length;
      totalStarsSum = filteredFeedback.reduce((sum, f) => sum + f.stars, 0);
      wouldHireAgainCount = filteredFeedback.filter(f => f.wouldHireAgain === true).length;
    }

    const avgClientSatisfaction = totalFeedback > 0 ? totalStarsSum / totalFeedback : 0;
    const wouldHireAgainPercentage = totalFeedback > 0 ? (wouldHireAgainCount / totalFeedback) * 100 : 0;
    const overallClientSatisfactionScore = totalFeedback > 0 
      ? (avgClientSatisfaction * 20 + wouldHireAgainPercentage) / 2 // Convert 5-star to 100-point scale and average with hire-again %
      : 0;

    // Get issues data for company work orders
    const workOrderIds = companyWorkOrders.map(wo => wo.id);
    let totalIssues = 0;
    let resolvedIssues = 0;
    let avgResolutionTime = 0;

    if (workOrderIds.length > 0) {
      const issuesData = await db
        .select({
          id: structuredIssues.id,
          status: structuredIssues.status,
          priority: structuredIssues.priority,
          createdAt: structuredIssues.createdAt,
          reviewedAt: structuredIssues.reviewedAt
        })
        .from(structuredIssues)
        .where(sql`${structuredIssues.workOrderId} = ANY(${workOrderIds})`);

      totalIssues = issuesData.length;
      resolvedIssues = issuesData.filter(issue => issue.status === 'resolved').length;

      // Calculate average resolution time for resolved issues
      const resolvedIssuesWithTime = issuesData.filter(issue => 
        issue.status === 'resolved' && issue.reviewedAt
      );

      if (resolvedIssuesWithTime.length > 0) {
        const totalResolutionTime = resolvedIssuesWithTime.reduce((sum, issue) => {
          const created = new Date(issue.createdAt).getTime();
          const resolved = new Date(issue.reviewedAt!).getTime();
          return sum + (resolved - created);
        }, 0);
        
        avgResolutionTime = totalResolutionTime / resolvedIssuesWithTime.length / (1000 * 60 * 60); // Convert to hours
      }
    }

    const issueRate = completedJobs > 0 ? (totalIssues / completedJobs) * 100 : 0;
    const issueResolutionRate = totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0;

    // Get audit compliance score for the company
    let auditComplianceScore = 0;
    if (agentIds.length > 0) {
      const auditLogs = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(sql`${auditLogs.performedBy} = ANY(${agentIds})`);

      const auditLogCount = auditLogs[0]?.count || 0;
      auditComplianceScore = completedJobs > 0 ? (auditLogCount / completedJobs) : 0;
    }

    return {
      companyId,
      totalJobs,
      completedJobs,
      jobVolumeData: Array.from(jobVolumeByDay.entries()).map(([date, count]) => ({
        date,
        count
      })),
      overallClientSatisfactionScore: Math.round(overallClientSatisfactionScore * 100) / 100,
      avgClientSatisfaction: Math.round(avgClientSatisfaction * 100) / 100,
      wouldHireAgainPercentage: Math.round(wouldHireAgainPercentage * 100) / 100,
      totalFeedback,
      serviceComplianceScore: Math.round(serviceComplianceScore * 100) / 100,
      onTimeStartPercentage: Math.round(onTimeStartPercentage * 100) / 100,
      onTimeFinishPercentage: Math.round(onTimeFinishPercentage * 100) / 100,
      issueRate: Math.round(issueRate * 100) / 100,
      totalIssues,
      resolvedIssues,
      issueResolutionRate: Math.round(issueResolutionRate * 100) / 100,
      avgResolutionTimeHours: Math.round(avgResolutionTime * 100) / 100,
      auditComplianceScore: Math.round(auditComplianceScore * 100) / 100,
      dateRange: {
        from: dateFrom || null,
        to: dateTo || null
      }
    };
  }

  // Exclusive Network operations
  async createExclusiveNetworkMember(member: InsertExclusiveNetworkMember): Promise<ExclusiveNetworkMember> {
    const [newMember] = await db.insert(exclusiveNetworkMembers).values(member).returning();
    return newMember;
  }

  async getExclusiveNetworkMembers(clientCompanyId: string): Promise<ExclusiveNetworkMember[]> {
    return await db
      .select()
      .from(exclusiveNetworkMembers)
      .where(eq(exclusiveNetworkMembers.clientCompanyId, clientCompanyId))
      .orderBy(desc(exclusiveNetworkMembers.createdAt));
  }

  async getAllExclusiveNetworkMembers(): Promise<ExclusiveNetworkMember[]> {
    const clientCompanies = alias(companies, 'clientCompanies');
    const serviceCompanies = alias(companies, 'serviceCompanies');
    return await db
      .select({
        id: exclusiveNetworkMembers.id,
        clientCompany: {
          id: clientCompanies.id,
          name: clientCompanies.name,
          type: clientCompanies.type
        },
        serviceCompany: {
          id: serviceCompanies.id,
          name: serviceCompanies.name,
          type: serviceCompanies.type
        },
        completedWorkOrders: exclusiveNetworkMembers.completedWorkOrders,
        averageRating: exclusiveNetworkMembers.averageRating,
        qualifiesForExclusive: exclusiveNetworkMembers.qualifiesForExclusive,
        isActive: exclusiveNetworkMembers.isActive,
        addedAt: exclusiveNetworkMembers.addedAt,
        lastWorkOrderAt: exclusiveNetworkMembers.lastWorkOrderAt,
        createdAt: exclusiveNetworkMembers.createdAt,
        updatedAt: exclusiveNetworkMembers.updatedAt
      })
      .from(exclusiveNetworkMembers)
      .leftJoin(clientCompanies, eq(exclusiveNetworkMembers.clientCompanyId, clientCompanies.id))
      .leftJoin(serviceCompanies, eq(exclusiveNetworkMembers.serviceCompanyId, serviceCompanies.id))
      .orderBy(desc(exclusiveNetworkMembers.createdAt));
  }

  async updateExclusiveNetworkMember(id: string, updates: Partial<InsertExclusiveNetworkMember>): Promise<ExclusiveNetworkMember> {
    const [updated] = await db
      .update(exclusiveNetworkMembers)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(exclusiveNetworkMembers.id, id))
      .returning();
    return updated;
  }

  async checkExclusiveNetworkEligibility(clientCompanyId: string, serviceCompanyId: string): Promise<boolean> {
    // Check if there are 5+ completed work orders with 4+ star average rating
    const completedOrders = await db
      .select()
      .from(workOrders)
      .where(and(
        eq(workOrders.clientCompanyId, clientCompanyId),
        eq(workOrders.companyId, serviceCompanyId),
        eq(workOrders.status, 'completed')
      ));

    if (completedOrders.length >= 5) {
      // Calculate average rating across all completed work orders
      let totalRating = 0;
      let ratingCount = 0;

      for (const order of completedOrders) {
        const fieldAgentRatings = await db
          .select()
          .from(clientFieldAgentRatings)
          .where(eq(clientFieldAgentRatings.workOrderId, order.id));
        
        const dispatcherRatings = await db
          .select()
          .from(clientDispatcherRatings)
          .where(eq(clientDispatcherRatings.workOrderId, order.id));

        fieldAgentRatings.forEach(rating => {
          const avgRating = (rating.communicationRating + rating.timelinessRating + rating.workSatisfactionRating) / 3;
          totalRating += avgRating;
          ratingCount++;
        });

        dispatcherRatings.forEach(rating => {
          const avgRating = (rating.communicationRating + rating.managementRating + rating.fieldAgentRating) / 3;
          totalRating += avgRating;
          ratingCount++;
        });
      }

      if (ratingCount > 0) {
        const averageRating = totalRating / ratingCount;
        return averageRating >= 4.0;
      }
    }

    return false;
  }

  // Issue operations (hazard reporting)
  async createIssue(issueData: InsertIssue): Promise<Issue> {
    const [issue] = await db.insert(issues).values(issueData).returning();
    return issue;
  }

  async getIssue(id: string): Promise<Issue | undefined> {
    const [issue] = await db.select().from(issues).where(eq(issues.id, id));
    return issue;
  }

  async getIssuesByWorkOrder(workOrderId: string): Promise<Issue[]> {
    return await db
      .select()
      .from(issues)
      .where(eq(issues.workOrderId, workOrderId))
      .orderBy(desc(issues.createdAt));
  }

  async getIssuesByCompany(companyId: string): Promise<Issue[]> {
    return await db
      .select()
      .from(issues)
      .where(eq(issues.companyId, companyId))
      .orderBy(desc(issues.createdAt));
  }

  async getAllOpenIssues(): Promise<Issue[]> {
    return await db
      .select()
      .from(issues)
      .where(sql`status IN ('open', 'investigating')`)
      .orderBy(desc(issues.createdAt));
  }

  async updateIssue(id: string, updates: Partial<InsertIssue>): Promise<Issue> {
    const [issue] = await db
      .update(issues)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, id))
      .returning();
    return issue;
  }

  async resolveIssue(id: string, resolvedById: string, resolution: string): Promise<Issue> {
    const [issue] = await db
      .update(issues)
      .set({
        status: 'resolved',
        resolvedById,
        resolution,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(issues.id, id))
      .returning();
    return issue;
  }
  // Project operations
  async getProjects(): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
  }

  async getAllProjects(): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(projectData)
      .returning();
    return project;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async requestProjectAssignment(projectId: string, companyId: string, requestedById: string): Promise<ProjectAssignment> {
    const [assignment] = await db
      .insert(projectAssignments)
      .values({
        projectId,
        companyId,
        requestedById,
        assignedAt: new Date(),
      })
      .returning();
    return assignment;
  }

  async getProjectAssignments(projectId: string): Promise<ProjectAssignment[]> {
    return await db
      .select()
      .from(projectAssignments)
      .where(eq(projectAssignments.projectId, projectId));
  }

  // Project budget deduction workflow implementations
  async approveBudget(projectId: string, approvedById: string): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({
        budgetStatus: 'approved',
        budgetApprovedById: approvedById,
        budgetApprovedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();
    return project;
  }

  async deductBudget(projectId: string, actualCost?: number): Promise<Project> {
    const updates: Partial<{
      budgetStatus: string;
      budgetDeductedAt: Date;
      actualCost?: number;
    }> = {
      budgetStatus: 'deducted',
      budgetDeductedAt: new Date(),
    };

    if (actualCost !== undefined) {
      updates.actualCost = actualCost;
    }

    const [project] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, projectId))
      .returning();
    return project;
  }

  async cancelBudgetApproval(projectId: string): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({
        budgetStatus: 'cancelled',
        budgetApprovedById: null,
        budgetApprovedAt: null,
      })
      .where(eq(projects.id, projectId))
      .returning();
    return project;
  }

  async getProjectsBudgetStatus(status?: string): Promise<Project[]> {
    if (status) {
      return await db
        .select()
        .from(projects)
        .where(eq(projects.budgetStatus, status))
        .orderBy(desc(projects.createdAt));
    }
    return await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
  }

  // Project Requirements operations
  async createProjectRequirement(requirementData: InsertProjectRequirement): Promise<ProjectRequirement> {
    const [requirement] = await db
      .insert(projectRequirements)
      .values(requirementData)
      .returning();
    return requirement;
  }

  async getProjectRequirements(projectId: string): Promise<ProjectRequirement[]> {
    return await db
      .select()
      .from(projectRequirements)
      .where(eq(projectRequirements.projectId, projectId));
  }

  async updateProjectRequirement(id: string, updates: Partial<InsertProjectRequirement>): Promise<ProjectRequirement> {
    const [requirement] = await db
      .update(projectRequirements)
      .set(updates)
      .where(eq(projectRequirements.id, id))
      .returning();
    return requirement;
  }

  // Approval Requests operations
  async createApprovalRequest(requestData: InsertApprovalRequest): Promise<ApprovalRequest> {
    const [request] = await db
      .insert(approvalRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async getApprovalRequests(reviewerId: string): Promise<ApprovalRequest[]> {
    return await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.reviewerId, reviewerId));
  }

  async getAllApprovalRequests(): Promise<ApprovalRequest[]> {
    return await db
      .select()
      .from(approvalRequests)
      .orderBy(desc(approvalRequests.createdAt));
  }

  async reviewApprovalRequest(id: string, status: 'approved' | 'denied', reviewerId: string, response?: string): Promise<ApprovalRequest> {
    const [request] = await db
      .update(approvalRequests)
      .set({
        status,
        reviewerId,
        response,
        reviewedAt: new Date(),
      })
      .where(eq(approvalRequests.id, id))
      .returning();
    return request;
  }

  // Access Requests operations
  async createAccessRequest(requestData: InsertAccessRequest): Promise<AccessRequest> {
    const [request] = await db
      .insert(accessRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async getAllAccessRequests(): Promise<AccessRequest[]> {
    return await db
      .select()
      .from(accessRequests)
      .orderBy(desc(accessRequests.requestedAt));
  }

  async getPendingAccessRequests(): Promise<AccessRequest[]> {
    return await db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.status, 'pending'))
      .orderBy(desc(accessRequests.requestedAt));
  }

  async updateAccessRequest(id: string, updates: Partial<InsertAccessRequest>): Promise<AccessRequest> {
    const [request] = await db
      .update(accessRequests)
      .set(updates)
      .where(eq(accessRequests.id, id))
      .returning();
    return request;
  }

  async reviewAccessRequest(id: string, status: 'approved' | 'rejected', reviewedById: string, notes?: string): Promise<AccessRequest> {
    const [request] = await db
      .update(accessRequests)
      .set({
        status,
        reviewedBy: reviewedById,
        reviewedAt: new Date(),
        notes,
      })
      .where(eq(accessRequests.id, id))
      .returning();
    return request;
  }
  // Exclusive Network operations
  async createExclusiveNetwork(data: InsertExclusiveNetwork): Promise<ExclusiveNetwork> {
    const [exclusiveNetwork] = await db
      .insert(exclusiveNetworks)
      .values(data)
      .returning();
    return exclusiveNetwork;
  }

  async getExclusiveNetworks(clientCompanyId?: string, serviceCompanyId?: string): Promise<ExclusiveNetwork[]> {
    let query = db.select().from(exclusiveNetworks).where(eq(exclusiveNetworks.isActive, true));
    
    if (clientCompanyId) {
      query = query.where(eq(exclusiveNetworks.clientCompanyId, clientCompanyId));
    }
    if (serviceCompanyId) {
      query = query.where(eq(exclusiveNetworks.serviceCompanyId, serviceCompanyId));
    }
    
    return await query;
  }

  async deleteExclusiveNetwork(id: string): Promise<void> {
    await db.delete(exclusiveNetworks).where(eq(exclusiveNetworks.id, id));
  }

  async getExclusiveServiceCompanies(clientCompanyId: string): Promise<Company[]> {
    const result = await db
      .select({ 
        company: companies
      })
      .from(exclusiveNetworks)
      .innerJoin(companies, eq(exclusiveNetworks.serviceCompanyId, companies.id))
      .where(
        and(
          eq(exclusiveNetworks.clientCompanyId, clientCompanyId),
          eq(exclusiveNetworks.isActive, true),
          eq(companies.isActive, true)
        )
      );
    
    return result.map(r => r.company);
  }

  // Client final approval and profit calculation implementations
  async clientApprovalWorkOrder(workOrderId: string, status: 'approved' | 'rejected' | 'requires_revision', clientId: string, notes?: string): Promise<WorkOrder> {
    const [workOrder] = await db
      .update(workOrders)
      .set({
        clientApprovalStatus: status,
        clientApprovedById: clientId,
        clientApprovedAt: new Date(),
        clientApprovalNotes: notes,
      })
      .where(eq(workOrders.id, workOrderId))
      .returning();
    
    // If approved, calculate profit
    if (status === 'approved') {
      await this.calculateProfit(workOrderId);
    }
    
    return workOrder;
  }

  async calculateProfit(workOrderId: string): Promise<WorkOrder> {
    const [workOrder] = await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.id, workOrderId));

    if (!workOrder) {
      throw new Error("Work order not found");
    }

    // Calculate total budget based on budget type
    let totalBudget = 0;
    const budgetAmount = parseFloat(workOrder.budgetAmount?.toString() || '0');
    const estimatedHours = parseFloat(workOrder.estimatedHours?.toString() || '0');
    const actualHours = parseFloat(workOrder.actualHours?.toString() || '0');
    const devicesInstalled = workOrder.devicesInstalled || 0;

    switch (workOrder.budgetType) {
      case 'fixed':
        totalBudget = budgetAmount;
        break;
      case 'hourly':
        totalBudget = budgetAmount * actualHours; // Use actual hours for profit calculation
        break;
      case 'per_device':
        totalBudget = budgetAmount * devicesInstalled;
        break;
      case 'materials_plus_labor':
        totalBudget = budgetAmount;
        break;
      default:
        totalBudget = budgetAmount;
        break;
    }

    // Calculate actual cost (for now, using 70% of budget as base cost)
    const baseCostRatio = 0.7;
    const actualCost = totalBudget * baseCostRatio;
    const actualProfit = totalBudget - actualCost;
    const profitMargin = totalBudget > 0 ? (actualProfit / totalBudget) * 100 : 0;

    const [updatedWorkOrder] = await db
      .update(workOrders)
      .set({
        actualProfit,
        profitMargin,
        profitCalculatedAt: new Date(),
      })
      .where(eq(workOrders.id, workOrderId))
      .returning();

    return updatedWorkOrder;
  }

  async getPendingClientApprovals(clientCompanyId?: string): Promise<WorkOrder[]> {
    let query = db
      .select()
      .from(workOrders)
      .where(
        and(
          eq(workOrders.status, 'completed'),
          eq(workOrders.clientApprovalStatus, 'pending')
        )
      );

    if (clientCompanyId) {
      query = query.where(eq(workOrders.companyId, clientCompanyId));
    }

    return await query.orderBy(desc(workOrders.completedAt));
  }

  async getCompletedWorkOrdersForApproval(): Promise<WorkOrder[]> {
    return await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.status, 'completed'))
      .orderBy(desc(workOrders.completedAt));
  }

  // Job Requests operations
  async createJobRequest(request: InsertJobRequest): Promise<JobRequest> {
    const [jobRequest] = await db
      .insert(jobRequests)
      .values(request)
      .returning();
    return jobRequest;
  }

  async getJobRequestsByWorkOrder(workOrderId: string): Promise<JobRequest[]> {
    return await db
      .select()
      .from(jobRequests)
      .where(eq(jobRequests.workOrderId, workOrderId));
  }

  async getJobRequestsByCompany(companyId: string): Promise<JobRequest[]> {
    return await db
      .select({
        id: jobRequests.id,
        workOrderId: jobRequests.workOrderId,
        agentId: jobRequests.agentId,
        status: jobRequests.status,
        message: jobRequests.message,
        requestedAt: jobRequests.requestedAt,
        reviewedBy: jobRequests.reviewedBy,
        reviewedAt: jobRequests.reviewedAt,
        rejectionReason: jobRequests.rejectionReason,
        createdAt: jobRequests.createdAt,
        updatedAt: jobRequests.updatedAt,
        // Include agent information
        agentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        agentEmail: users.email,
        // Include work order information
        workOrderTitle: workOrders.title,
        workOrderLocation: workOrders.location,
        workOrderStatus: workOrders.status,
      })
      .from(jobRequests)
      .leftJoin(users, eq(jobRequests.agentId, users.id))
      .leftJoin(workOrders, eq(jobRequests.workOrderId, workOrders.id))
      .where(eq(users.companyId, companyId));
  }

  async getJobRequestsByAgent(agentId: string): Promise<JobRequest[]> {
    return await db
      .select()
      .from(jobRequests)
      .where(eq(jobRequests.agentId, agentId));
  }

  async reviewJobRequest(id: string, status: 'approved' | 'rejected', reviewedById: string, rejectionReason?: string): Promise<JobRequest> {
    const [updated] = await db
      .update(jobRequests)
      .set({
        status,
        reviewedBy: reviewedById,
        reviewedAt: new Date(),
        rejectionReason: status === 'rejected' ? rejectionReason : null,
        updatedAt: new Date(),
      })
      .where(eq(jobRequests.id, id))
      .returning();

    // If approved, assign the work order to the agent
    if (status === 'approved' && updated) {
      await db
        .update(workOrders)
        .set({
          assignedTo: updated.agentId,
          status: 'assigned',
          updatedAt: new Date(),
        })
        .where(eq(workOrders.id, updated.workOrderId));
    }

    return updated;
  }
  // ==================================================
  // JOB REQUESTS OPERATIONS
  // ==================================================

  async createJobRequest(requestData: InsertJobRequest): Promise<JobRequest> {
    const [request] = await db.insert(jobRequests).values(requestData).returning();
    return request;
  }

  async getJobRequestsByCompany(companyId: string): Promise<any[]> {
    // Get job requests for work orders belonging to this company
    return await db
      .select({
        id: jobRequests.id,
        workOrderId: jobRequests.workOrderId,
        agentId: jobRequests.agentId,
        status: jobRequests.status,
        message: jobRequests.message,
        requestedAt: jobRequests.requestedAt,
        reviewedBy: jobRequests.reviewedBy,
        reviewedAt: jobRequests.reviewedAt,
        rejectionReason: jobRequests.rejectionReason,
        createdAt: jobRequests.createdAt,
        updatedAt: jobRequests.updatedAt,
        // Agent info
        agentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        agentEmail: users.email,
        // Work order info
        workOrderTitle: workOrders.title,
        workOrderLocation: workOrders.location,
        workOrderStatus: workOrders.status,
      })
      .from(jobRequests)
      .innerJoin(workOrders, eq(jobRequests.workOrderId, workOrders.id))
      .innerJoin(users, eq(jobRequests.agentId, users.id))
      .where(eq(workOrders.companyId, companyId))
      .orderBy(desc(jobRequests.requestedAt));
  }

  async getJobRequestsByAgent(agentId: string): Promise<JobRequest[]> {
    return await db
      .select()
      .from(jobRequests)
      .where(eq(jobRequests.agentId, agentId))
      .orderBy(desc(jobRequests.requestedAt));
  }

  async reviewJobRequest(requestId: string, reviewData: { 
    status: 'approved' | 'rejected'; 
    reviewedBy: string; 
    rejectionReason?: string 
  }): Promise<JobRequest> {
    const [request] = await db
      .update(jobRequests)
      .set({
        status: reviewData.status,
        reviewedBy: reviewData.reviewedBy,
        reviewedAt: new Date(),
        rejectionReason: reviewData.rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(jobRequests.id, requestId))
      .returning();
    
    // If approved, assign the work order to the agent
    if (reviewData.status === 'approved' && request) {
      await db
        .update(workOrders)
        .set({
          assigneeId: request.agentId,
          status: 'assigned',
          updatedAt: new Date(),
        })
        .where(eq(workOrders.id, request.workOrderId));
    }
    
    return request;
  }

  async getJobRequest(requestId: string): Promise<JobRequest | undefined> {
    const [request] = await db.select().from(jobRequests).where(eq(jobRequests.id, requestId));
    return request;
  }

  // Onboarding Request operations
  async createOnboardingRequest(request: InsertOnboardingRequest): Promise<OnboardingRequest> {
    const [newRequest] = await db
      .insert(onboardingRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async getAllOnboardingRequests(): Promise<OnboardingRequest[]> {
    return await db
      .select({
        id: onboardingRequests.id,
        name: onboardingRequests.name,
        email: onboardingRequests.email,
        phone: onboardingRequests.phone,
        company: onboardingRequests.company,
        skills: onboardingRequests.skills,
        resumeUrl: onboardingRequests.resumeUrl,
        motivation: onboardingRequests.motivation,
        status: onboardingRequests.status,
        reviewedBy: onboardingRequests.reviewedBy,
        reviewedAt: onboardingRequests.reviewedAt,
        rejectionReason: onboardingRequests.rejectionReason,
        createdAt: onboardingRequests.createdAt,
        updatedAt: onboardingRequests.updatedAt,
        // Include reviewer information
        reviewer: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(onboardingRequests)
      .leftJoin(users, eq(onboardingRequests.reviewedBy, users.id))
      .orderBy(desc(onboardingRequests.createdAt));
  }

  async getOnboardingRequest(id: string): Promise<OnboardingRequest | undefined> {
    const [request] = await db
      .select()
      .from(onboardingRequests)
      .where(eq(onboardingRequests.id, id));
    return request;
  }

  async reviewOnboardingRequest(
    id: string, 
    status: 'approved' | 'rejected', 
    reviewedById: string, 
    rejectionReason?: string
  ): Promise<OnboardingRequest> {
    const [request] = await db
      .update(onboardingRequests)
      .set({
        status,
        reviewedBy: reviewedById,
        reviewedAt: new Date(),
        rejectionReason: status === 'rejected' ? rejectionReason : null,
        updatedAt: new Date(),
      })
      .where(eq(onboardingRequests.id, id))
      .returning();

    // If approved, create a user account with field_agent role
    if (status === 'approved' && request) {
      // Find the first service company to assign the new user to
      const serviceCompanies = await db
        .select()
        .from(companies)
        .where(eq(companies.type, 'service'))
        .limit(1);

      const assignedCompanyId = serviceCompanies.length > 0 ? serviceCompanies[0].id : null;

      await this.createUser({
        email: request.email,
        firstName: request.name.split(' ')[0] || request.name,
        lastName: request.name.split(' ').slice(1).join(' ') || '',
        phone: request.phone || undefined,
        roles: ['field_agent'],
        companyId: assignedCompanyId,
        skills: request.skills || [],
        isActive: true,
      });
    }
    
    return request;
  }

  // Job Message operations
  async createJobMessage(jobMessage: InsertJobMessage): Promise<JobMessage> {
    const [message] = await db
      .insert(jobMessages)
      .values(jobMessage)
      .returning();
    return message;
  }

  async getJobMessagesByWorkOrder(workOrderId: string): Promise<JobMessage[]> {
    return await db
      .select({
        id: jobMessages.id,
        workOrderId: jobMessages.workOrderId,
        senderId: jobMessages.senderId,
        message: jobMessages.message,
        attachments: jobMessages.attachments,
        isImportant: jobMessages.isImportant,
        isPinned: jobMessages.isPinned,
        mentionedUserIds: jobMessages.mentionedUserIds,
        sentAt: jobMessages.sentAt,
        editedAt: jobMessages.editedAt,
        createdAt: jobMessages.createdAt,
        updatedAt: jobMessages.updatedAt,
        sender: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          roles: users.roles,
          companyId: users.companyId,
          profileImageUrl: users.profileImageUrl,
        }
      })
      .from(jobMessages)
      .leftJoin(users, eq(jobMessages.senderId, users.id))
      .where(eq(jobMessages.workOrderId, workOrderId))
      .orderBy(desc(jobMessages.sentAt));
  }

  async updateJobMessage(id: string, updates: Partial<InsertJobMessage>): Promise<JobMessage> {
    const [message] = await db
      .update(jobMessages)
      .set({ ...updates, updatedAt: new Date(), editedAt: new Date() })
      .where(eq(jobMessages.id, id))
      .returning();
    return message;
  }

  async pinJobMessage(id: string): Promise<JobMessage> {
    const [message] = await db
      .update(jobMessages)
      .set({ isPinned: true, updatedAt: new Date() })
      .where(eq(jobMessages.id, id))
      .returning();
    return message;
  }

  async unpinJobMessage(id: string): Promise<JobMessage> {
    const [message] = await db
      .update(jobMessages)
      .set({ isPinned: false, updatedAt: new Date() })
      .where(eq(jobMessages.id, id))
      .returning();
    return message;
  }

  // Risk Analysis operations
  async createRiskScore(riskScore: InsertRiskScore): Promise<RiskScore> {
    const [newScore] = await db
      .insert(riskScores)
      .values(riskScore)
      .returning();
    return newScore;
  }

  async getRiskScores(entityType?: string, entityId?: string, limit: number = 50): Promise<RiskScore[]> {
    let query = db.select().from(riskScores);
    
    const conditions = [];
    if (entityType) {
      conditions.push(eq(riskScores.entityType, entityType));
    }
    if (entityId) {
      conditions.push(eq(riskScores.entityId, entityId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query
      .orderBy(desc(riskScores.createdAt))
      .limit(limit);
  }

  async getHighRiskEntities(threshold: number = 70): Promise<RiskScore[]> {
    return await db
      .select()
      .from(riskScores)
      .where(sql`${riskScores.score} >= ${threshold}`)
      .orderBy(desc(riskScores.score), desc(riskScores.createdAt));
  }

  async calculateRiskScore(entityType: string, entityId: string, periodStart: string, periodEnd: string): Promise<{
    score: number;
    flaggedMetrics: Record<string, any>;
  }> {
    const flaggedMetrics: Record<string, any> = {};
    let totalWeightedScore = 0;
    
    if (entityType === 'agent') {
      // Get agent performance metrics
      const agentMetrics = await this.calculateAgentPerformanceMetrics(entityId, periodStart, periodEnd);
      
      // Calculate risk factors for agents
      let clientSatisfactionScore = 100;
      let timelinessScore = 100;
      let issueScore = 100;
      let complianceScore = 100;
      
      // Client Satisfaction (40% weight)
      if (agentMetrics.avgStarRating < 3.5) {
        clientSatisfactionScore = (agentMetrics.avgStarRating / 5) * 100;
        flaggedMetrics.clientSatisfaction = {
          current: agentMetrics.avgStarRating,
          threshold: 3.5,
          severity: agentMetrics.avgStarRating < 2.5 ? 'high' : 'medium'
        };
      }
      
      // Timeliness (20% weight)
      const avgTimelinessScore = (agentMetrics.onTimeStartPercentage + agentMetrics.onTimeFinishPercentage) / 2;
      if (avgTimelinessScore < 80) {
        timelinessScore = avgTimelinessScore;
        flaggedMetrics.timeliness = {
          current: avgTimelinessScore,
          threshold: 80,
          severity: avgTimelinessScore < 60 ? 'high' : 'medium'
        };
      }
      
      // Issue Rate (30% weight)
      if (agentMetrics.issueResolutionRate < 85) {
        issueScore = agentMetrics.issueResolutionRate;
        flaggedMetrics.issueResolution = {
          current: agentMetrics.issueResolutionRate,
          threshold: 85,
          severity: agentMetrics.issueResolutionRate < 70 ? 'high' : 'medium'
        };
      }
      
      // Compliance (10% weight)
      if (agentMetrics.complianceScore < 0.8) {
        complianceScore = agentMetrics.complianceScore * 100;
        flaggedMetrics.compliance = {
          current: agentMetrics.complianceScore,
          threshold: 0.8,
          severity: agentMetrics.complianceScore < 0.6 ? 'high' : 'medium'
        };
      }
      
      // Weighted risk score calculation (lower score = higher risk)
      totalWeightedScore = (
        (clientSatisfactionScore * 0.4) +
        (timelinessScore * 0.2) +
        (issueScore * 0.3) +
        (complianceScore * 0.1)
      );
      
    } else if (entityType === 'company') {
      // Get company service quality metrics
      const companyMetrics = await this.calculateServiceQualityMetrics(entityId, periodStart, periodEnd);
      
      // Calculate risk factors for companies
      let clientSatisfactionScore = 100;
      let timelinessScore = 100;
      let issueScore = 100;
      let complianceScore = 100;
      
      // Client Satisfaction (40% weight)
      if (companyMetrics.avgClientSatisfaction < 3.5) {
        clientSatisfactionScore = (companyMetrics.avgClientSatisfaction / 5) * 100;
        flaggedMetrics.clientSatisfaction = {
          current: companyMetrics.avgClientSatisfaction,
          threshold: 3.5,
          severity: companyMetrics.avgClientSatisfaction < 2.5 ? 'high' : 'medium'
        };
      }
      
      // Service Timeliness (20% weight)
      if (companyMetrics.serviceComplianceScore < 80) {
        timelinessScore = companyMetrics.serviceComplianceScore;
        flaggedMetrics.timeliness = {
          current: companyMetrics.serviceComplianceScore,
          threshold: 80,
          severity: companyMetrics.serviceComplianceScore < 60 ? 'high' : 'medium'
        };
      }
      
      // Issue Rate (30% weight)
      if (companyMetrics.issueRate > 15) {
        issueScore = Math.max(0, 100 - companyMetrics.issueRate);
        flaggedMetrics.issueRate = {
          current: companyMetrics.issueRate,
          threshold: 15,
          severity: companyMetrics.issueRate > 25 ? 'high' : 'medium'
        };
      }
      
      // Compliance (10% weight)
      if (companyMetrics.auditComplianceScore < 0.8) {
        complianceScore = companyMetrics.auditComplianceScore * 100;
        flaggedMetrics.compliance = {
          current: companyMetrics.auditComplianceScore,
          threshold: 0.8,
          severity: companyMetrics.auditComplianceScore < 0.6 ? 'high' : 'medium'
        };
      }
      
      // Weighted risk score calculation (lower score = higher risk)
      totalWeightedScore = (
        (clientSatisfactionScore * 0.4) +
        (timelinessScore * 0.2) +
        (issueScore * 0.3) +
        (complianceScore * 0.1)
      );
    }
    
    // Convert to risk score (0-100, where higher = more risk)
    const riskScore = Math.max(0, Math.min(100, 100 - totalWeightedScore));
    
    return {
      score: Math.round(riskScore),
      flaggedMetrics
    };
  }

  async createRiskIntervention(intervention: InsertRiskIntervention): Promise<RiskIntervention> {
    const [newIntervention] = await db
      .insert(riskInterventions)
      .values(intervention)
      .returning();
    return newIntervention;
  }

  async getRiskInterventions(riskId?: string, assignedTo?: string): Promise<RiskIntervention[]> {
    let query = db.select().from(riskInterventions);
    
    const conditions = [];
    if (riskId) {
      conditions.push(eq(riskInterventions.riskId, riskId));
    }
    if (assignedTo) {
      conditions.push(eq(riskInterventions.assignedTo, assignedTo));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(riskInterventions.createdAt));
  }

  async updateRiskIntervention(id: string, updates: Partial<InsertRiskIntervention & { completedAt?: Date }>): Promise<RiskIntervention> {
    const [updated] = await db
      .update(riskInterventions)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(riskInterventions.id, id))
      .returning();
    return updated;
  }

  async getEntitiesAtRisk(threshold: number = 70): Promise<{
    agents: Array<{ agent: any; riskScore: RiskScore }>;
    companies: Array<{ company: any; riskScore: RiskScore }>;
  }> {
    const highRiskScores = await this.getHighRiskEntities(threshold);
    
    const agents = [];
    const companies = [];
    
    for (const riskScore of highRiskScores) {
      if (riskScore.entityType === 'agent') {
        const agent = await this.getUser(riskScore.entityId);
        if (agent) {
          agents.push({ agent, riskScore });
        }
      } else if (riskScore.entityType === 'company') {
        const company = await this.getCompany(riskScore.entityId);
        if (company) {
          companies.push({ company, riskScore });
        }
      }
    }
    
    return { agents, companies };
  }

  // Work Order Tools operations
  async createWorkOrderTool(tool: InsertWorkOrderTool): Promise<WorkOrderTool> {
    const [newTool] = await db
      .insert(workOrderTools)
      .values(tool)
      .returning();
    return newTool;
  }

  async getWorkOrderTools(workOrderId: string): Promise<WorkOrderTool[]> {
    return await db
      .select()
      .from(workOrderTools)
      .where(eq(workOrderTools.workOrderId, workOrderId))
      .orderBy(workOrderTools.orderIndex, workOrderTools.createdAt);
  }

  async updateWorkOrderTool(id: string, updates: Partial<InsertWorkOrderTool>): Promise<WorkOrderTool> {
    const [updated] = await db
      .update(workOrderTools)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(workOrderTools.id, id))
      .returning();
    return updated;
  }

  async deleteWorkOrderTool(id: string): Promise<void> {
    await db
      .delete(workOrderTools)
      .where(eq(workOrderTools.id, id));
  }

  async confirmToolAvailability(id: string, confirmedById: string): Promise<WorkOrderTool> {
    const [updated] = await db
      .update(workOrderTools)
      .set({
        isAvailable: true,
        confirmedById,
        confirmedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(workOrderTools.id, id))
      .returning();
    return updated;
  }

  // Work Order Documents operations
  async createWorkOrderDocument(document: InsertWorkOrderDocument): Promise<WorkOrderDocument> {
    const [newDocument] = await db
      .insert(workOrderDocuments)
      .values(document)
      .returning();
    return newDocument;
  }

  async getWorkOrderDocuments(workOrderId: string): Promise<WorkOrderDocument[]> {
    return await db
      .select()
      .from(workOrderDocuments)
      .where(eq(workOrderDocuments.workOrderId, workOrderId))
      .orderBy(workOrderDocuments.orderIndex, workOrderDocuments.createdAt);
  }

  async updateWorkOrderDocument(id: string, updates: Partial<InsertWorkOrderDocument>): Promise<WorkOrderDocument> {
    const [updated] = await db
      .update(workOrderDocuments)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(workOrderDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteWorkOrderDocument(id: string): Promise<void> {
    await db
      .delete(workOrderDocuments)
      .where(eq(workOrderDocuments.id, id));
  }

  async markDocumentCompleted(id: string, completedById: string): Promise<WorkOrderDocument> {
    const [updated] = await db
      .update(workOrderDocuments)
      .set({
        isCompleted: true,
        completedById,
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(workOrderDocuments.id, id))
      .returning();
    return updated;
  }

  // Bid operations (Module 14)
  async createBid(bidData: InsertBid): Promise<Bid> {
    const bidId = nanoid();
    const [bid] = await db.insert(bids).values({
      ...bidData,
      id: bidId,
    }).returning();
    return bid;
  }

  async getBid(id: string): Promise<Bid | undefined> {
    const [bid] = await db.select().from(bids).where(eq(bids.id, id));
    return bid;
  }

  async getBidsForWorkOrder(workOrderId: string): Promise<Bid[]> {
    return await db.select().from(bids).where(eq(bids.workOrderId, workOrderId)).orderBy(desc(bids.createdAt));
  }

  async getBidsForUser(userId: string): Promise<Bid[]> {
    return await db.select().from(bids).where(eq(bids.userId, userId)).orderBy(desc(bids.createdAt));
  }

  async updateBid(id: string, updates: Partial<InsertBid>): Promise<Bid> {
    const [updated] = await db
      .update(bids)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bids.id, id))
      .returning();
    return updated;
  }

  async acceptBid(id: string, acceptedById: string): Promise<Bid> {
    const [updated] = await db
      .update(bids)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedById,
        updatedAt: new Date(),
      })
      .where(eq(bids.id, id))
      .returning();
    
    // Update work order with the bid winner
    if (updated) {
      await db
        .update(workOrders)
        .set({
          assigneeId: updated.userId,
          budgetAmount: updated.bidAmount,
          status: 'confirmed',
        })
        .where(eq(workOrders.id, updated.workOrderId));
    }
    
    return updated;
  }

  async rejectBid(id: string, notes?: string): Promise<Bid> {
    const [updated] = await db
      .update(bids)
      .set({
        status: 'rejected',
        notes,
        updatedAt: new Date(),
      })
      .where(eq(bids.id, id))
      .returning();
    return updated;
  }

  // Credential operations (Module 15)
  async createCredential(credentialData: InsertCredential): Promise<Credential> {
    const credentialId = nanoid();
    const [credential] = await db.insert(credentials).values({
      ...credentialData,
      id: credentialId,
    }).returning();
    return credential;
  }

  async getCredential(id: string): Promise<Credential | undefined> {
    const [credential] = await db.select().from(credentials).where(eq(credentials.id, id));
    return credential;
  }

  async getUserCredentials(userId: string): Promise<Credential[]> {
    return await db.select().from(credentials).where(eq(credentials.userId, userId)).orderBy(desc(credentials.createdAt));
  }

  async updateCredential(id: string, updates: Partial<InsertCredential>): Promise<Credential> {
    const [updated] = await db
      .update(credentials)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(credentials.id, id))
      .returning();
    return updated;
  }

  async deleteCredential(id: string): Promise<void> {
    await db.delete(credentials).where(eq(credentials.id, id));
  }

  async getExpiringCredentials(daysFromNow: number): Promise<Credential[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysFromNow);
    
    return await db
      .select()
      .from(credentials)
      .where(
        and(
          eq(credentials.status, 'active'),
          sql`${credentials.expiresAt} <= ${futureDate}`,
          eq(credentials.renewalReminderSent, false)
        )
      );
  }

  // Recognition operations (Module 16)
  async createRecognition(recognitionData: InsertRecognition): Promise<Recognition> {
    const recognitionId = nanoid();
    const [newRecognition] = await db.insert(recognition).values({
      ...recognitionData,
      id: recognitionId,
    }).returning();
    return newRecognition;
  }

  async getUserRecognition(userId: string): Promise<Recognition[]> {
    return await db.select().from(recognition).where(eq(recognition.userId, userId)).orderBy(desc(recognition.awardedAt));
  }

  async updateRecognition(id: string, updates: Partial<InsertRecognition>): Promise<Recognition> {
    const [updated] = await db
      .update(recognition)
      .set(updates)
      .where(eq(recognition.id, id))
      .returning();
    return updated;
  }

  async deleteRecognition(id: string): Promise<void> {
    await db.delete(recognition).where(eq(recognition.id, id));
  }

  // Category Performance operations (Module 11)
  async getCategoryPerformanceMetrics(): Promise<{
    category: string;
    totalJobs: number;
    averageMargin: number;
    averageCompletionHours: number;
    totalRevenue: number;
  }[]> {
    const results = await db
      .select({
        category: workOrders.category,
        totalJobs: count(workOrders.id),
        averageMargin: avg(workOrders.profitMargin),
        averageCompletionHours: avg(workOrders.actualHours),
        totalRevenue: sum(workOrders.budgetAmount),
      })
      .from(workOrders)
      .where(
        and(
          isNotNull(workOrders.category),
          eq(workOrders.status, 'completed')
        )
      )
      .groupBy(workOrders.category)
      .orderBy(desc(sum(workOrders.budgetAmount)));

    return results.map(result => ({
      category: result.category || 'Uncategorized',
      totalJobs: Number(result.totalJobs) || 0,
      averageMargin: Number(result.averageMargin) || 0,
      averageCompletionHours: Number(result.averageCompletionHours) || 0,
      totalRevenue: Number(result.totalRevenue) || 0,
    }));
  }

  // Work Order Filter operations (Module 12)
  async createWorkOrderFilter(filter: InsertWorkOrderFilter): Promise<WorkOrderFilter> {
    const filterId = nanoid();
    const [newFilter] = await db
      .insert(workOrderFilters)
      .values({ ...filter, id: filterId })
      .returning();
    return newFilter;
  }

  async getWorkOrderFilter(workOrderId: string): Promise<WorkOrderFilter | undefined> {
    const [filter] = await db
      .select()
      .from(workOrderFilters)
      .where(eq(workOrderFilters.workOrderId, workOrderId));
    return filter;
  }

  async updateWorkOrderFilter(workOrderId: string, updates: Partial<InsertWorkOrderFilter>): Promise<WorkOrderFilter> {
    const [updatedFilter] = await db
      .update(workOrderFilters)
      .set(updates)
      .where(eq(workOrderFilters.workOrderId, workOrderId))
      .returning();
    return updatedFilter;
  }

  async deleteWorkOrderFilter(workOrderId: string): Promise<void> {
    await db
      .delete(workOrderFilters)
      .where(eq(workOrderFilters.workOrderId, workOrderId));
  }

  // Agent Recommendation operations (Module 13)
  async createAgentRecommendation(recommendation: InsertAgentRecommendation): Promise<AgentRecommendation> {
    const recommendationId = nanoid();
    const [newRecommendation] = await db
      .insert(agentRecommendations)
      .values({ ...recommendation, id: recommendationId })
      .returning();
    return newRecommendation;
  }

  async getAgentRecommendations(workOrderId: string): Promise<AgentRecommendation[]> {
    return await db
      .select()
      .from(agentRecommendations)
      .where(eq(agentRecommendations.workOrderId, workOrderId))
      .orderBy(desc(agentRecommendations.score));
  }

  async updateAgentRecommendation(id: string, updates: Partial<InsertAgentRecommendation>): Promise<AgentRecommendation> {
    const [updatedRecommendation] = await db
      .update(agentRecommendations)
      .set(updates)
      .where(eq(agentRecommendations.id, id))
      .returning();
    return updatedRecommendation;
  }

  async deleteAgentRecommendation(id: string): Promise<void> {
    await db
      .delete(agentRecommendations)
      .where(eq(agentRecommendations.id, id));
  }

  async generateRecommendationsForWorkOrder(workOrderId: string): Promise<AgentRecommendation[]> {
    // Get work order details
    const [workOrder] = await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.id, workOrderId));

    if (!workOrder) return [];

    // Get all field agents with their skills and locations
    const agents = await db
      .select({
        id: users.id,
        username: users.username,
        skills: agentSkills.skill,
        latitude: agentLocations.latitude,
        longitude: agentLocations.longitude,
      })
      .from(users)
      .leftJoin(agentSkills, eq(users.id, agentSkills.agentId))
      .leftJoin(agentLocations, eq(users.id, agentLocations.agentId))
      .where(sql`'field_agent' = ANY(${users.roles})`);

    // Generate recommendations with scoring
    const recommendations: InsertAgentRecommendation[] = [];
    const agentMap = new Map();

    agents.forEach(agent => {
      if (!agentMap.has(agent.id)) {
        agentMap.set(agent.id, {
          id: agent.id,
          username: agent.username,
          skills: [],
          latitude: agent.latitude,
          longitude: agent.longitude,
        });
      }
      if (agent.skills) {
        agentMap.get(agent.id).skills.push(agent.skills);
      }
    });

    for (const [agentId, agentData] of agentMap) {
      let score = 50; // Base score
      let reasoning = "Base agent score";

      // Skill matching
      if (workOrder.skillsRequired && agentData.skills.length > 0) {
        const requiredSkills = Array.isArray(workOrder.skillsRequired) 
          ? workOrder.skillsRequired 
          : [workOrder.skillsRequired];
        
        const matchingSkills = requiredSkills.filter(skill => 
          agentData.skills.some(agentSkill => 
            agentSkill.toLowerCase().includes(skill.toLowerCase())
          )
        );

        score += matchingSkills.length * 20;
        if (matchingSkills.length > 0) {
          reasoning += `, matching skills: ${matchingSkills.join(', ')}`;
        }
      }

      // Location proximity (if both have coordinates)
      if (workOrder.latitude && workOrder.longitude && 
          agentData.latitude && agentData.longitude) {
        const distance = this.calculateDistance(
          workOrder.latitude, workOrder.longitude,
          agentData.latitude, agentData.longitude
        );
        
        if (distance < 10) score += 30;
        else if (distance < 25) score += 20;
        else if (distance < 50) score += 10;
        
        reasoning += `, distance: ${distance.toFixed(1)}km`;
      }

      recommendations.push({
        workOrderId,
        agentId,
        score: Math.min(score, 100),
        reasoning,
        status: 'pending',
      });
    }

    // Save recommendations
    if (recommendations.length > 0) {
      await db.insert(agentRecommendations).values(recommendations);
    }

    return await this.getAgentRecommendations(workOrderId);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Agent Skills operations (Module 3)
  async createAgentSkill(skill: InsertAgentSkill): Promise<AgentSkill> {
    const skillId = nanoid();
    const [newSkill] = await db
      .insert(agentSkills)
      .values({ ...skill, id: skillId })
      .returning();
    return newSkill;
  }

  async getAgentSkills(agentId: string): Promise<AgentSkill[]> {
    return await db
      .select()
      .from(agentSkills)
      .where(eq(agentSkills.agentId, agentId))
      .orderBy(desc(agentSkills.createdAt));
  }

  async updateAgentSkill(id: string, updates: Partial<InsertAgentSkill>): Promise<AgentSkill> {
    const [updatedSkill] = await db
      .update(agentSkills)
      .set(updates)
      .where(eq(agentSkills.id, id))
      .returning();
    return updatedSkill;
  }

  async deleteAgentSkill(id: string): Promise<void> {
    await db
      .delete(agentSkills)
      .where(eq(agentSkills.id, id));
  }

  async deleteAgentSkills(agentId: string): Promise<void> {
    await db
      .delete(agentSkills)
      .where(eq(agentSkills.agentId, agentId));
  }

  async verifyAgentSkill(id: string, verifiedById: string): Promise<AgentSkill> {
    const [verifiedSkill] = await db
      .update(agentSkills)
      .set({
        verified: true,
        verifiedBy: verifiedById,
        verifiedAt: new Date(),
      })
      .where(eq(agentSkills.id, id))
      .returning();
    return verifiedSkill;
  }

  // Agent Location operations (Module 3)
  async createAgentLocation(location: InsertAgentLocation): Promise<AgentLocation> {
    const locationId = nanoid();
    const [newLocation] = await db
      .insert(agentLocations)
      .values({ ...location, id: locationId })
      .returning();
    return newLocation;
  }

  async getAgentLocations(agentId: string): Promise<AgentLocation[]> {
    return await db
      .select()
      .from(agentLocations)
      .where(eq(agentLocations.agentId, agentId))
      .orderBy(desc(agentLocations.isPrimary), desc(agentLocations.createdAt));
  }

  async getPrimaryAgentLocation(agentId: string): Promise<AgentLocation | undefined> {
    const [location] = await db
      .select()
      .from(agentLocations)
      .where(and(eq(agentLocations.agentId, agentId), eq(agentLocations.isPrimary, true)));
    return location;
  }

  async getAgentPrimaryLocation(agentId: string): Promise<AgentLocation | undefined> {
    return this.getPrimaryAgentLocation(agentId);
  }

  async updateAgentLocation(id: string, updates: Partial<InsertAgentLocation>): Promise<AgentLocation> {
    const [updatedLocation] = await db
      .update(agentLocations)
      .set(updates)
      .where(eq(agentLocations.id, id))
      .returning();
    return updatedLocation;
  }

  async deleteAgentLocation(id: string): Promise<void> {
    await db
      .delete(agentLocations)
      .where(eq(agentLocations.id, id));
  }

  async setPrimaryLocation(agentId: string, locationId: string): Promise<void> {
    // First, set all locations for this agent to non-primary
    await db
      .update(agentLocations)
      .set({ isPrimary: false })
      .where(eq(agentLocations.agentId, agentId));

    // Then set the specified location as primary
    await db
      .update(agentLocations)
      .set({ isPrimary: true })
      .where(eq(agentLocations.id, locationId));
  }

  // Enhanced Search operations (Module 12)
  async searchWorkOrdersWithFilters(filters: {
    skillTags?: string[];
    locationRadius?: number;
    minPayRate?: number;
    maxPayRate?: number;
    urgencyLevel?: string;
    experienceRequired?: string;
    certificationRequired?: string[];
    equipmentProvided?: boolean;
    agentLocation?: { lat: number; lng: number };
  }): Promise<WorkOrder[]> {
    let query = db.select().from(workOrders);
    const conditions = [];

    // Only show available work orders
    conditions.push(eq(workOrders.status, "Open"));

    // Pay rate filtering
    if (filters.minPayRate) {
      conditions.push(gte(sql`CAST(${workOrders.budget} AS NUMERIC)`, filters.minPayRate));
    }
    if (filters.maxPayRate) {
      conditions.push(lte(sql`CAST(${workOrders.budget} AS NUMERIC)`, filters.maxPayRate));
    }

    // Urgency level filtering
    if (filters.urgencyLevel) {
      conditions.push(eq(workOrders.urgencyLevel, filters.urgencyLevel));
    }

    // Experience level filtering
    if (filters.experienceRequired) {
      conditions.push(ilike(workOrders.description, `%${filters.experienceRequired}%`));
    }

    // Equipment provided filtering
    if (filters.equipmentProvided !== undefined) {
      conditions.push(eq(workOrders.equipmentProvided, filters.equipmentProvided));
    }

    // Skills filtering
    if (filters.skillTags && filters.skillTags.length > 0) {
      const skillConditions = filters.skillTags.map(skill =>
        ilike(workOrders.skillsRequired, `%${skill}%`)
      );
      conditions.push(or(...skillConditions));
    }

    // Location radius filtering
    if (filters.agentLocation && filters.locationRadius) {
      // This is a simplified implementation - in production you'd use PostGIS
      const { lat, lng } = filters.agentLocation;
      const latRange = filters.locationRadius / 111; // Rough km to degree conversion
      const lngRange = filters.locationRadius / (111 * Math.cos(lat * Math.PI / 180));
      
      conditions.push(
        and(
          gte(workOrders.latitude, lat - latRange),
          lte(workOrders.latitude, lat + latRange),
          gte(workOrders.longitude, lng - lngRange),
          lte(workOrders.longitude, lng + lngRange)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(workOrders.createdAt));
  }

  // Enhanced Job Visibility Logic (Module 3)
  async getVisibleJobsForAgent(filters: {
    agentId: string;
    agentLocation?: { lat: number; lng: number };
    agentSkills: string[];
    radiusKm: number;
    respectExclusiveNetworks?: boolean;
    agentExperienceLevel?: 'junior' | 'intermediate' | 'senior';
    priorityFilter?: 'low' | 'medium' | 'high' | 'urgent';
    includeAssigned?: boolean;
  }): Promise<WorkOrder[]> {
    const agent = await this.getUser(filters.agentId);
    if (!agent) return [];

    let query = db
      .select({
        ...workOrders,
        companyName: companies.name,
        clientCompanyName: sql<string>`client_company.name`,
        skillMatchScore: sql<number>`
          CASE 
            WHEN ${workOrders.requiredSkills} IS NULL OR array_length(${workOrders.requiredSkills}, 1) IS NULL THEN 100
            ELSE (
              SELECT COALESCE(
                (COUNT(*) * 100.0 / array_length(${workOrders.requiredSkills}, 1))::integer, 
                0
              )
              FROM unnest(${workOrders.requiredSkills}) AS required_skill
              WHERE required_skill = ANY(${sql.raw(`ARRAY[${filters.agentSkills.map(s => `'${s}'`).join(',')}]::text[]`)})
            )
          END
        `
      })
      .from(workOrders)
      .leftJoin(companies, eq(workOrders.companyId, companies.id))
      .leftJoin(
        sql`companies AS client_company`, 
        sql`${workOrders.clientCompanyId} = client_company.id`
      );

    const conditions = [];

    // Base visibility rules
    if (filters.includeAssigned) {
      conditions.push(
        or(
          inArray(workOrders.status, ["scheduled", "confirmed"]),
          and(
            eq(workOrders.status, "assigned"),
            eq(workOrders.assigneeId, filters.agentId)
          )
        )
      );
    } else {
      conditions.push(inArray(workOrders.status, ["scheduled", "confirmed"]));
    }

    // Experience level filtering
    if (filters.agentExperienceLevel) {
      const experienceConditions = [];
      
      switch (filters.agentExperienceLevel) {
        case 'junior':
          // Junior agents can only see medium and low priority jobs
          experienceConditions.push(inArray(workOrders.priority, ['low', 'medium']));
          break;
        case 'intermediate':
          // Intermediate agents can see all except urgent without prior approval
          experienceConditions.push(inArray(workOrders.priority, ['low', 'medium', 'high']));
          break;
        case 'senior':
          // Senior agents can see all jobs
          break;
      }

      if (experienceConditions.length > 0) {
        conditions.push(or(...experienceConditions));
      }
    }

    // Priority filter
    if (filters.priorityFilter) {
      conditions.push(eq(workOrders.priority, filters.priorityFilter));
    }

    // Enhanced location radius filtering with travel time consideration
    if (filters.agentLocation && filters.radiusKm > 0) {
      const { lat, lng } = filters.agentLocation;
      const latRange = filters.radiusKm / 111;
      const lngRange = filters.radiusKm / (111 * Math.cos(lat * Math.PI / 180));
      
      conditions.push(
        and(
          gte(workOrders.latitude, lat - latRange),
          lte(workOrders.latitude, lat + latRange),
          gte(workOrders.longitude, lng - lngRange),
          lte(workOrders.longitude, lng + lngRange)
        )
      );
    }

    // Enhanced skills matching with scoring
    if (filters.agentSkills.length > 0) {
      conditions.push(
        or(
          eq(sql`array_length(${workOrders.requiredSkills}, 1)`, null),
          sql`${workOrders.requiredSkills} && ${sql.raw(`ARRAY[${filters.agentSkills.map(s => `'${s}'`).join(',')}]::text[]`)}`
        )
      );
    }

    // Enhanced exclusive network logic
    if (filters.respectExclusiveNetworks && agent.companyId) {
      const exclusiveNetworkSubquery = db
        .select({ clientCompanyId: exclusiveNetworks.clientCompanyId })
        .from(exclusiveNetworks)
        .where(
          and(
            eq(exclusiveNetworks.serviceCompanyId, agent.companyId),
            eq(exclusiveNetworks.isActive, true)
          )
        );

      conditions.push(
        or(
          eq(workOrders.visibilityScope, "public"),
          and(
            eq(workOrders.visibilityScope, "exclusive"),
            inArray(workOrders.clientCompanyId, exclusiveNetworkSubquery)
          )
        )
      );
    }

    // Company access control
    if (agent.companyId) {
      // Agents can see jobs from their own company or jobs posted to the public network
      conditions.push(
        or(
          eq(workOrders.companyId, agent.companyId),
          eq(workOrders.visibilityScope, "public"),
          eq(workOrders.visibilityScope, "exclusive")
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Enhanced ordering: prioritize by skill match score, then by priority, then by creation date
    return await query.orderBy(
      desc(sql`skill_match_score`),
      sql`CASE ${workOrders.priority} WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC`,
      desc(workOrders.createdAt)
    );
  }

  // Project Heartbeat Monitor operations
  async createProjectHeartbeat(heartbeat: InsertProjectHeartbeat): Promise<ProjectHeartbeat> {
    const heartbeatId = nanoid();
    const [newHeartbeat] = await db
      .insert(projectHeartbeats)
      .values({ ...heartbeat, id: heartbeatId })
      .returning();
    return newHeartbeat;
  }

  async getProjectHeartbeat(workOrderId: string): Promise<ProjectHeartbeat | undefined> {
    const [heartbeat] = await db
      .select()
      .from(projectHeartbeats)
      .where(eq(projectHeartbeats.workOrderId, workOrderId));
    return heartbeat;
  }

  async updateProjectHeartbeat(id: string, updates: Partial<InsertProjectHeartbeat>): Promise<ProjectHeartbeat> {
    const [updatedHeartbeat] = await db
      .update(projectHeartbeats)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectHeartbeats.id, id))
      .returning();
    return updatedHeartbeat;
  }

  async deleteProjectHeartbeat(id: string): Promise<void> {
    await db
      .delete(projectHeartbeats)
      .where(eq(projectHeartbeats.id, id));
  }

  async createHeartbeatEvent(event: InsertHeartbeatEvent): Promise<HeartbeatEvent> {
    const eventId = nanoid();
    const [newEvent] = await db
      .insert(heartbeatEvents)
      .values({ ...event, id: eventId })
      .returning();
    return newEvent;
  }

  async getHeartbeatEvents(heartbeatId: string): Promise<HeartbeatEvent[]> {
    return await db
      .select()
      .from(heartbeatEvents)
      .where(eq(heartbeatEvents.heartbeatId, heartbeatId))
      .orderBy(desc(heartbeatEvents.createdAt));
  }

  async updateHealthScore(heartbeatId: string, newScore: number, changeReason: string, triggeredBy?: string): Promise<ProjectHeartbeat> {
    // Update the heartbeat health score
    const [updatedHeartbeat] = await db
      .update(projectHeartbeats)
      .set({ 
        healthScore: newScore,
        lastHealthCheck: new Date(),
        updatedAt: new Date()
      })
      .where(eq(projectHeartbeats.id, heartbeatId))
      .returning();

    // Create an event for the health score change
    await this.createHeartbeatEvent({
      heartbeatId,
      eventType: 'health_score_change',
      eventData: { newScore, reason: changeReason },
      impact: newScore >= 80 ? 'positive' : newScore >= 60 ? 'neutral' : 'negative',
      healthScoreChange: newScore - (updatedHeartbeat.healthScore || 100),
      triggeredBy,
      automaticEvent: !triggeredBy,
      notes: changeReason
    });

    return updatedHeartbeat;
  }

  async triggerHeartbeatEvent(workOrderId: string, eventType: string, eventData: any, triggeredBy?: string): Promise<void> {
    const heartbeat = await this.getProjectHeartbeat(workOrderId);
    if (!heartbeat || !heartbeat.monitoringEnabled) return;

    // Calculate health score impact based on event type
    let healthScoreChange = 0;
    let impact: 'positive' | 'neutral' | 'negative' = 'neutral';

    switch (eventType) {
      case 'check_in':
        healthScoreChange = 5;
        impact = 'positive';
        break;
      case 'deliverable_update':
        healthScoreChange = eventData.progress > 0 ? 10 : -5;
        impact = eventData.progress > 0 ? 'positive' : 'negative';
        break;
      case 'budget_update':
        healthScoreChange = eventData.overBudget ? -10 : 0;
        impact = eventData.overBudget ? 'negative' : 'neutral';
        break;
      case 'issue_reported':
        healthScoreChange = eventData.severity === 'high' ? -15 : -5;
        impact = 'negative';
        break;
      case 'status_change':
        healthScoreChange = eventData.newStatus === 'completed' ? 20 : 0;
        impact = eventData.newStatus === 'completed' ? 'positive' : 'neutral';
        break;
    }

    // Create the event
    await this.createHeartbeatEvent({
      heartbeatId: heartbeat.id,
      eventType,
      eventData,
      impact,
      healthScoreChange,
      triggeredBy,
      automaticEvent: !triggeredBy
    });

    // Update health score if there's a change
    if (healthScoreChange !== 0) {
      const newScore = Math.max(0, Math.min(100, heartbeat.healthScore + healthScoreChange));
      await this.updateHealthScore(heartbeat.id, newScore, `${eventType} event`, triggeredBy);
    }
  }

  async getProjectHealthSummary(companyId?: string): Promise<any> {
    let query = db
      .select({
        workOrderId: projectHeartbeats.workOrderId,
        projectStatus: projectHeartbeats.projectStatus,
        healthScore: projectHeartbeats.healthScore,
        workOrderTitle: workOrders.title,
        lastActivity: projectHeartbeats.lastActivity
      })
      .from(projectHeartbeats)
      .leftJoin(workOrders, eq(projectHeartbeats.workOrderId, workOrders.id));

    if (companyId) {
      query = query.where(eq(workOrders.companyId, companyId));
    }

    return await query.orderBy(desc(projectHeartbeats.lastActivity));
  }

  // Enhanced Structured Issues Operations (Module 5)
  async getStructuredIssues(filters: any = {}): Promise<Issue[]> {
    let query = db
      .select({
        ...issues,
        reporter: {
          firstName: sql<string>`reporter.first_name`,
          lastName: sql<string>`reporter.last_name`,
          email: sql<string>`reporter.email`,
        },
        workOrder: {
          title: sql<string>`work_order.title`,
          location: sql<string>`work_order.location`,
        },
        resolver: {
          firstName: sql<string>`resolver.first_name`,
          lastName: sql<string>`resolver.last_name`,
        },
      })
      .from(issues)
      .leftJoin(sql`users AS reporter`, sql`${issues.reportedById} = reporter.id`)
      .leftJoin(sql`work_orders AS work_order`, sql`${issues.workOrderId} = work_order.id`)
      .leftJoin(sql`users AS resolver`, sql`${issues.resolvedById} = resolver.id`);

    const conditions = [];

    if (filters.workOrderId) {
      conditions.push(eq(issues.workOrderId, filters.workOrderId));
    }
    if (filters.status) {
      conditions.push(eq(issues.status, filters.status));
    }
    if (filters.severity) {
      conditions.push(eq(issues.severity, filters.severity));
    }
    if (filters.category) {
      conditions.push(eq(issues.category, filters.category));
    }
    if (filters.reporterId) {
      conditions.push(eq(issues.reportedById, filters.reporterId));
    }
    if (filters.companyId) {
      conditions.push(eq(issues.companyId, filters.companyId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(issues.createdAt));
  }

  async createStructuredIssue(issueData: InsertIssue): Promise<Issue> {
    const issueId = nanoid();
    const [issue] = await db
      .insert(issues)
      .values({ ...issueData, id: issueId })
      .returning();
    return issue;
  }

  async updateStructuredIssue(issueId: string, updates: Partial<InsertIssue>): Promise<Issue> {
    const [issue] = await db
      .update(issues)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(issues.id, issueId))
      .returning();
    return issue;
  }

  async getStructuredIssue(issueId: string): Promise<Issue | undefined> {
    const [issue] = await db
      .select({
        ...issues,
        reporter: {
          firstName: sql<string>`reporter.first_name`,
          lastName: sql<string>`reporter.last_name`,
          email: sql<string>`reporter.email`,
        },
        workOrder: {
          title: sql<string>`work_order.title`,
          location: sql<string>`work_order.location`,
        },
        resolver: {
          firstName: sql<string>`resolver.first_name`,
          lastName: sql<string>`resolver.last_name`,
        },
      })
      .from(issues)
      .leftJoin(sql`users AS reporter`, sql`${issues.reportedById} = reporter.id`)
      .leftJoin(sql`work_orders AS work_order`, sql`${issues.workOrderId} = work_order.id`)
      .leftJoin(sql`users AS resolver`, sql`${issues.resolvedById} = resolver.id`)
      .where(eq(issues.id, issueId));

    return issue;
  }

  async createEscalationNotification(issueId: string, companyId: string | null): Promise<void> {
    if (!companyId) return;

    // Get all administrators and managers in the company
    const managers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.companyId, companyId),
          sql`${users.roles} && ARRAY['administrator', 'manager']::text[]`
        )
      );

    const issue = await this.getStructuredIssue(issueId);
    if (!issue) return;

    // Create notifications for each manager
    for (const manager of managers) {
      await db.insert(notifications).values({
        id: nanoid(),
        userId: manager.id,
        type: 'issue_escalation',
        title: `High Severity Issue Reported`,
        message: `A ${issue.severity} severity issue has been reported: ${issue.title}`,
        workOrderId: issue.workOrderId,
      });
    }
  }

  async getIssueAnalytics(params: { period: number; companyId?: string }): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - params.period);

    let query = db
      .select({
        total: sql<number>`COUNT(*)`,
        severity: issues.severity,
        status: issues.status,
        category: issues.category,
      })
      .from(issues)
      .where(gte(issues.createdAt, startDate));

    if (params.companyId) {
      query = query.where(eq(issues.companyId, params.companyId));
    }

    const results = await query.groupBy(issues.severity, issues.status, issues.category);

    // Calculate summary statistics
    const summary = {
      totalIssues: results.reduce((sum, row) => sum + row.total, 0),
      bySeverity: results.reduce((acc, row) => {
        acc[row.severity] = (acc[row.severity] || 0) + row.total;
        return acc;
      }, {} as Record<string, number>),
      byStatus: results.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + row.total;
        return acc;
      }, {} as Record<string, number>),
      byCategory: results.reduce((acc, row) => {
        acc[row.category] = (acc[row.category] || 0) + row.total;
        return acc;
      }, {} as Record<string, number>),
    };

    return summary;
  }

  // Client Feedback System Operations (Module 6)
  async getExistingRatings(workOrderId: string, clientId: string): Promise<any> {
    const [fieldAgentRating] = await db
      .select()
      .from(clientFieldAgentRatings)
      .where(
        and(
          eq(clientFieldAgentRatings.workOrderId, workOrderId),
          eq(clientFieldAgentRatings.clientId, clientId)
        )
      );

    const [dispatcherRating] = await db
      .select()
      .from(clientDispatcherRatings)
      .where(
        and(
          eq(clientDispatcherRatings.workOrderId, workOrderId),
          eq(clientDispatcherRatings.clientId, clientId)
        )
      );

    const [serviceRating] = await db
      .select()
      .from(serviceClientRatings)
      .where(
        and(
          eq(serviceClientRatings.workOrderId, workOrderId),
          eq(serviceClientRatings.raterId, clientId)
        )
      );

    return {
      fieldAgent: !!fieldAgentRating,
      dispatcher: !!dispatcherRating,
      service: !!serviceRating,
    };
  }

  async getFeedbackAnalytics(params: {
    timeFrame: number;
    category: string;
    companyId?: string;
    agentId?: string;
  }): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - params.timeFrame);

    // Get field agent ratings
    let fieldAgentQuery = db
      .select({
        communicationRating: clientFieldAgentRatings.communicationRating,
        timelinessRating: clientFieldAgentRatings.timelinessRating,
        workSatisfactionRating: clientFieldAgentRatings.workSatisfactionRating,
        workOrderId: clientFieldAgentRatings.workOrderId,
        createdAt: clientFieldAgentRatings.createdAt,
      })
      .from(clientFieldAgentRatings)
      .where(gte(clientFieldAgentRatings.createdAt, startDate));

    if (params.companyId) {
      fieldAgentQuery = fieldAgentQuery.where(eq(clientFieldAgentRatings.companyId, params.companyId));
    }

    if (params.agentId) {
      fieldAgentQuery = fieldAgentQuery.where(eq(clientFieldAgentRatings.fieldAgentId, params.agentId));
    }

    const fieldAgentRatings = await fieldAgentQuery;

    // Calculate overall rating and analytics
    const totalRatings = fieldAgentRatings.length;
    const totalWorkOrders = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(workOrders)
      .where(
        and(
          gte(workOrders.createdAt, startDate),
          params.companyId ? eq(workOrders.companyId, params.companyId) : undefined,
          params.agentId ? eq(workOrders.assigneeId, params.agentId) : undefined
        ).filter(Boolean)
      );

    const responseRate = totalWorkOrders[0]?.count > 0 
      ? (totalRatings / totalWorkOrders[0].count) * 100 
      : 0;

    // Calculate average ratings
    const avgCommunication = fieldAgentRatings.length > 0
      ? fieldAgentRatings.reduce((sum, r) => sum + r.communicationRating, 0) / fieldAgentRatings.length
      : 0;

    const avgTimeliness = fieldAgentRatings.length > 0
      ? fieldAgentRatings.reduce((sum, r) => sum + r.timelinessRating, 0) / fieldAgentRatings.length
      : 0;

    const avgWorkSatisfaction = fieldAgentRatings.length > 0
      ? fieldAgentRatings.reduce((sum, r) => sum + r.workSatisfactionRating, 0) / fieldAgentRatings.length
      : 0;

    const overallRating = (avgCommunication + avgTimeliness + avgWorkSatisfaction) / 3;

    // Calculate satisfaction score (4+ stars)
    const highRatings = fieldAgentRatings.filter(r => 
      (r.communicationRating >= 4 && r.timelinessRating >= 4 && r.workSatisfactionRating >= 4)
    ).length;
    const satisfactionScore = totalRatings > 0 ? (highRatings / totalRatings) * 100 : 0;

    // Rating distribution
    const ratingDistribution = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    };

    fieldAgentRatings.forEach(rating => {
      const avg = (rating.communicationRating + rating.timelinessRating + rating.workSatisfactionRating) / 3;
      const rounded = Math.round(avg);
      if (ratingDistribution[rounded as keyof typeof ratingDistribution] !== undefined) {
        ratingDistribution[rounded as keyof typeof ratingDistribution]++;
      }
    });

    // Category breakdown
    const categoryBreakdown = [
      { name: 'Communication', rating: avgCommunication, count: totalRatings },
      { name: 'Timeliness', rating: avgTimeliness, count: totalRatings },
      { name: 'Work Satisfaction', rating: avgWorkSatisfaction, count: totalRatings },
    ];

    // Recent feedback (simplified)
    const recentFeedback = fieldAgentRatings
      .slice(0, 5)
      .map(rating => ({
        id: rating.workOrderId,
        averageRating: (rating.communicationRating + rating.timelinessRating + rating.workSatisfactionRating) / 3,
        workOrderTitle: `Work Order ${rating.workOrderId.slice(0, 8)}`,
        createdAt: rating.createdAt,
        clientName: 'Client User', // Would need to join with users table for real name
      }));

    // Action items (areas for improvement)
    const actionItems = [];
    if (avgCommunication < 3.5) {
      actionItems.push({
        title: 'Improve Communication',
        description: 'Communication rating is below threshold. Consider additional training.',
      });
    }
    if (avgTimeliness < 3.5) {
      actionItems.push({
        title: 'Improve Timeliness',
        description: 'Timeliness rating needs attention. Review scheduling processes.',
      });
    }
    if (avgWorkSatisfaction < 3.5) {
      actionItems.push({
        title: 'Enhance Work Quality',
        description: 'Work satisfaction scores indicate need for quality improvements.',
      });
    }

    return {
      overallRating,
      ratingTrend: 0, // Would need historical data for trend calculation
      totalReviews: totalRatings,
      reviewsThisPeriod: totalRatings,
      responseRate,
      satisfactionScore,
      categoryBreakdown,
      ratingDistribution,
      recentFeedback,
      actionItems,
    };
  }

  async getFeedbackTrends(params: {
    timeFrame: number;
    companyId?: string;
    agentId?: string;
  }): Promise<any> {
    // Implementation for trend analysis would require grouping by time periods
    // For now, return basic trend structure
    return {
      weekly: [],
      monthly: [],
      categories: {
        communication: { trend: 0, data: [] },
        timeliness: { trend: 0, data: [] },
        workSatisfaction: { trend: 0, data: [] },
      }
    };
  }

  async sendBulkFeedbackRequests(workOrderIds: string[], reminderType: string, requesterId: string): Promise<any> {
    const results = { sent: 0, failed: 0, alreadyRequested: 0 };

    for (const workOrderId of workOrderIds) {
      try {
        const workOrder = await this.getWorkOrder(workOrderId);
        if (!workOrder) {
          results.failed++;
          continue;
        }

        // Create notification for feedback request
        await db.insert(notifications).values({
          id: nanoid(),
          userId: workOrder.createdById,
          workOrderId: workOrderId,
          type: 'feedback_request',
          title: 'Feedback Request',
          message: `Please provide feedback for completed work order: ${workOrder.title}`,
        });

        results.sent++;
      } catch (error) {
        console.error(`Failed to send feedback request for work order ${workOrderId}:`, error);
        results.failed++;
      }
    }

    return results;
  }

  // M1 - Job Request System Operations
  async getJobRequests(params: {
    companyId?: string;
    viewMode?: string;
    search?: string;
    status?: string;
    priority?: string;
    category?: string;
    requesterId?: string;
  }): Promise<any[]> {
    let query = db
      .select({
        ...jobNetworkPosts,
        company: {
          name: sql<string>`company.name`,
        },
        postedBy: {
          firstName: sql<string>`posted_by.first_name`,
          lastName: sql<string>`posted_by.last_name`,
        },
      })
      .from(jobNetworkPosts)
      .leftJoin(sql`companies AS company`, sql`${jobNetworkPosts.clientCompanyId} = company.id`)
      .leftJoin(sql`users AS posted_by`, sql`${jobNetworkPosts.postedById} = posted_by.id`);

    const conditions = [];

    // Filter by view mode
    if (params.viewMode === 'client' && params.companyId) {
      conditions.push(eq(jobNetworkPosts.clientCompanyId, params.companyId));
    } else if (params.viewMode === 'service') {
      // Show public jobs and jobs routed to this company
      conditions.push(
        or(
          eq(jobNetworkPosts.isPublic, true),
          eq(jobNetworkPosts.routedToCompanyId, params.companyId!)
        )
      );
    } else if (params.viewMode === 'network') {
      // Show only public jobs
      conditions.push(eq(jobNetworkPosts.isPublic, true));
    }

    // Filter by search
    if (params.search) {
      conditions.push(
        or(
          ilike(jobNetworkPosts.title, `%${params.search}%`),
          ilike(jobNetworkPosts.description, `%${params.search}%`),
          ilike(jobNetworkPosts.location, `%${params.search}%`)
        )
      );
    }

    // Filter by status
    if (params.status) {
      conditions.push(eq(jobNetworkPosts.status, params.status));
    }

    // Filter by priority
    if (params.priority) {
      conditions.push(eq(jobNetworkPosts.priority, params.priority));
    }

    // Filter by category
    if (params.category) {
      conditions.push(eq(jobNetworkPosts.serviceCategory, params.category));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(jobNetworkPosts.createdAt));
  }

  async createJobRequest(requestData: any): Promise<any> {
    const requestId = nanoid();
    const [jobRequest] = await db
      .insert(jobNetworkPosts)
      .values({ ...requestData, id: requestId })
      .returning();
    return jobRequest;
  }

  async assignJobRequest(requestId: string, serviceCompanyId: string, assignedById: string): Promise<any> {
    const [assignedRequest] = await db
      .update(jobNetworkPosts)
      .set({
        status: 'assigned',
        assignedToCompanyId: serviceCompanyId,
        assignedById: assignedById,
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobNetworkPosts.id, requestId))
      .returning();

    // Create notification for the assignment
    const request = await db
      .select()
      .from(jobNetworkPosts)
      .where(eq(jobNetworkPosts.id, requestId))
      .limit(1);

    if (request[0]) {
      await db.insert(notifications).values({
        id: nanoid(),
        userId: request[0].postedById,
        type: 'job_assigned',
        title: 'Job Request Assigned',
        message: `Your job request "${request[0].title}" has been assigned to a service company.`,
      });
    }

    return assignedRequest;
  }

  // M2 - Contractor Onboarding Flow Operations
  async getContractorOnboarding(params: {
    companyId?: string;
    userId?: string;
    viewMode?: string;
    requesterId?: string;
  }): Promise<any[]> {
    let query = db
      .select({
        ...contractorOnboarding,
        user: {
          firstName: sql<string>`users.first_name`,
          lastName: sql<string>`users.last_name`,
          email: sql<string>`users.email`,
        },
        company: {
          name: sql<string>`companies.name`,
        },
      })
      .from(contractorOnboarding)
      .leftJoin(users, eq(contractorOnboarding.userId, users.id))
      .leftJoin(companies, eq(contractorOnboarding.companyId, companies.id));

    const conditions = [];

    // Filter by company
    if (params.companyId) {
      conditions.push(eq(contractorOnboarding.companyId, params.companyId));
    }

    // Filter by user
    if (params.userId) {
      conditions.push(eq(contractorOnboarding.userId, params.userId));
    }

    // Filter by view mode
    if (params.viewMode === 'applicant' && params.requesterId) {
      conditions.push(eq(contractorOnboarding.userId, params.requesterId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(contractorOnboarding.createdAt));
  }

  async getContractorOnboardingDetails(onboardingId: string, requesterId: string): Promise<any> {
    const [record] = await db
      .select({
        ...contractorOnboarding,
        user: {
          firstName: sql<string>`users.first_name`,
          lastName: sql<string>`users.last_name`,
          email: sql<string>`users.email`,
        },
        company: {
          name: sql<string>`companies.name`,
        },
      })
      .from(contractorOnboarding)
      .leftJoin(users, eq(contractorOnboarding.userId, users.id))
      .leftJoin(companies, eq(contractorOnboarding.companyId, companies.id))
      .where(eq(contractorOnboarding.id, onboardingId))
      .limit(1);

    return record;
  }

  async createContractorOnboarding(onboardingData: any): Promise<any> {
    const onboardingId = nanoid();
    const [record] = await db
      .insert(contractorOnboarding)
      .values({
        ...onboardingData,
        id: onboardingId,
        onboardingStage: 'application',
        applicationData: onboardingData.applicationData,
      })
      .returning();

    // Create notification for admin review
    await db.insert(notifications).values({
      id: nanoid(),
      userId: onboardingData.userId,
      type: 'onboarding_submitted',
      title: 'Onboarding Application Submitted',
      message: 'Your contractor onboarding application has been submitted for review.',
    });

    return record;
  }

  async updateOnboardingStage(onboardingId: string, stage: string, data: any, updatedById: string): Promise<any> {
    const updateData: any = {
      onboardingStage: stage,
      updatedAt: new Date(),
    };

    // Update specific fields based on stage
    switch (stage) {
      case 'documentation':
        updateData.documentsSubmitted = data.documents;
        break;
      case 'skills_assessment':
        updateData.skillsAssessmentScore = data.score;
        break;
      case 'background_check':
        updateData.backgroundCheckStatus = data.status;
        updateData.backgroundCheckData = data.checkData;
        break;
    }

    const [updatedRecord] = await db
      .update(contractorOnboarding)
      .set(updateData)
      .where(eq(contractorOnboarding.id, onboardingId))
      .returning();

    return updatedRecord;
  }

  async processOnboardingApproval(onboardingId: string, action: 'approve' | 'reject', notes: string, approvedById: string): Promise<any> {
    const updateData: any = {
      approvedById,
      updatedAt: new Date(),
    };

    if (action === 'approve') {
      updateData.onboardingStage = 'completed';
      updateData.completedAt = new Date();
      updateData.approvalNotes = notes;
      updateData.isActive = true;
    } else {
      updateData.onboardingStage = 'approval';
      updateData.rejectionReason = notes;
      updateData.isActive = false;
    }

    const [updatedRecord] = await db
      .update(contractorOnboarding)
      .set(updateData)
      .where(eq(contractorOnboarding.id, onboardingId))
      .returning();

    // Get the contractor's user record
    const record = await db
      .select()
      .from(contractorOnboarding)
      .where(eq(contractorOnboarding.id, onboardingId))
      .limit(1);

    if (record[0]) {
      // Create notification for the contractor
      await db.insert(notifications).values({
        id: nanoid(),
        userId: record[0].userId,
        type: action === 'approve' ? 'onboarding_approved' : 'onboarding_rejected',
        title: action === 'approve' ? 'Onboarding Approved' : 'Onboarding Rejected',
        message: action === 'approve' 
          ? 'Congratulations! Your contractor onboarding has been approved. You can now accept work assignments.'
          : `Your contractor onboarding application has been rejected. Reason: ${notes}`,
      });

      // If approved, update user role to field_agent if not already set
      if (action === 'approve') {
        const user = await this.getUser(record[0].userId);
        if (user && user.role === 'pending') {
          await db
            .update(users)
            .set({ role: 'field_agent', updatedAt: new Date() })
            .where(eq(users.id, record[0].userId));
        }
      }
    }

    return updatedRecord;
  }

  // M4 - Role-Aware Messaging Hub Operations
  async getMessagingChannels(params: {
    companyId?: string;
    workOrderId?: string;
    projectId?: string;
    viewMode?: string;
    userRole?: string;
    userId?: string;
  }): Promise<any[]> {
    let query = db
      .select({
        ...messagingChannels,
        creator: {
          firstName: sql<string>`users.first_name`,
          lastName: sql<string>`users.last_name`,
        },
        messageCount: sql<number>`COUNT(messages.id)`,
      })
      .from(messagingChannels)
      .leftJoin(users, eq(messagingChannels.createdById, users.id))
      .leftJoin(sql`channel_messages AS messages`, sql`${messagingChannels.id} = messages.channel_id`)
      .groupBy(messagingChannels.id, sql`users.first_name`, sql`users.last_name`);

    const conditions = [];

    // Filter by company
    if (params.companyId) {
      conditions.push(eq(messagingChannels.companyId, params.companyId));
    }

    // Filter by work order
    if (params.workOrderId) {
      conditions.push(eq(messagingChannels.workOrderId, params.workOrderId));
    }

    // Filter by project
    if (params.projectId) {
      conditions.push(eq(messagingChannels.projectId, params.projectId));
    }

    // Role-based access control
    if (params.userRole) {
      conditions.push(
        or(
          eq(messagingChannels.channelType, 'company_wide'),
          eq(messagingChannels.channelType, 'project_specific'),
          and(
            eq(messagingChannels.channelType, 'role_based'),
            sql`${params.userRole} = ANY(${messagingChannels.allowedRoles})`
          ),
          eq(messagingChannels.createdById, params.userId!)
        )
      );
    }

    // Exclude archived channels unless admin
    if (!['operations_director', 'administrator'].includes(params.userRole || '')) {
      conditions.push(eq(messagingChannels.isArchived, false));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(messagingChannels.lastActivityAt), desc(messagingChannels.createdAt));
  }

  async createMessagingChannel(channelData: any): Promise<any> {
    const channelId = nanoid();
    const [channel] = await db
      .insert(messagingChannels)
      .values({ ...channelData, id: channelId })
      .returning();

    // Create system message for channel creation
    await db.insert(channelMessages).values({
      id: nanoid(),
      channelId: channelId,
      senderId: channelData.createdById,
      message: `Channel "${channelData.name}" has been created.`,
      messageType: 'system',
      isSystemMessage: true,
    });

    return channel;
  }

  async getChannelMessages(channelId: string, userId: string): Promise<any[]> {
    // First check if user has access to the channel
    const hasAccess = await this.checkChannelAccess(channelId, userId);
    if (!hasAccess) {
      throw new Error('Access denied to this channel');
    }

    const messages = await db
      .select({
        ...channelMessages,
        sender: {
          firstName: sql<string>`sender.first_name`,
          lastName: sql<string>`sender.last_name`,
          role: sql<string>`sender.role`,
        },
        replyTo: {
          id: sql<string>`reply_to.id`,
          message: sql<string>`reply_to.message`,
          sender: {
            firstName: sql<string>`reply_sender.first_name`,
            lastName: sql<string>`reply_sender.last_name`,
          },
        },
      })
      .from(channelMessages)
      .leftJoin(sql`users AS sender`, sql`${channelMessages.senderId} = sender.id`)
      .leftJoin(sql`channel_messages AS reply_to`, sql`${channelMessages.replyToId} = reply_to.id`)
      .leftJoin(sql`users AS reply_sender`, sql`reply_to.sender_id = reply_sender.id`)
      .where(eq(channelMessages.channelId, channelId))
      .orderBy(asc(channelMessages.createdAt));

    return messages;
  }

  async createChannelMessage(messageData: any): Promise<any> {
    const messageId = nanoid();
    const [message] = await db
      .insert(channelMessages)
      .values({ ...messageData, id: messageId })
      .returning();

    // Update channel's last activity
    await db
      .update(messagingChannels)
      .set({ 
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(messagingChannels.id, messageData.channelId));

    return message;
  }

  async checkChannelAccess(channelId: string, userId: string, userRole?: string): Promise<boolean> {
    const [channel] = await db
      .select()
      .from(messagingChannels)
      .where(eq(messagingChannels.id, channelId))
      .limit(1);

    if (!channel) {
      return false;
    }

    // Channel creator always has access
    if (channel.createdById === userId) {
      return true;
    }

    // Operations director has access to all channels
    if (userRole === 'operations_director') {
      return true;
    }

    // Check role-based access
    if (channel.channelType === 'role_based') {
      return userRole ? channel.allowedRoles.includes(userRole) : false;
    }

    // Company-wide and project-specific channels are accessible by default
    return ['company_wide', 'project_specific'].includes(channel.channelType);
  }

  async archiveMessagingChannel(channelId: string, archivedById: string): Promise<any> {
    const [archivedChannel] = await db
      .update(messagingChannels)
      .set({
        isArchived: true,
        updatedAt: new Date(),
      })
      .where(eq(messagingChannels.id, channelId))
      .returning();

    // Create system message for archival
    await db.insert(channelMessages).values({
      id: nanoid(),
      channelId: channelId,
      senderId: archivedById,
      message: `Channel has been archived.`,
      messageType: 'system',
      isSystemMessage: true,
    });

    return archivedChannel;
  }

  // Project Heartbeat CRUD operations for Phase 2 implementation
  async createProjectHeartbeat(heartbeatData: any): Promise<any> {
    const [heartbeat] = await db
      .insert(projectHeartbeats)
      .values(heartbeatData)
      .returning();
    return heartbeat;
  }

  async getProjectHeartbeat(workOrderId: string): Promise<any> {
    const [heartbeat] = await db
      .select()
      .from(projectHeartbeats)
      .where(eq(projectHeartbeats.workOrderId, workOrderId));
    return heartbeat;
  }

  async getProjectHeartbeatById(heartbeatId: string): Promise<any> {
    const [heartbeat] = await db
      .select()
      .from(projectHeartbeats)
      .where(eq(projectHeartbeats.id, heartbeatId));
    return heartbeat;
  }

  async updateProjectHeartbeat(heartbeatId: string, updates: any): Promise<any> {
    const [updatedHeartbeat] = await db
      .update(projectHeartbeats)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(projectHeartbeats.id, heartbeatId))
      .returning();
    return updatedHeartbeat;
  }

  async createProjectHeartbeatEvent(eventData: any): Promise<any> {
    const [event] = await db
      .insert(projectHeartbeatEvents)
      .values(eventData)
      .returning();
    return event;
  }

  async getProjectHeartbeatEvents(heartbeatId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    return await db
      .select()
      .from(projectHeartbeatEvents)
      .where(eq(projectHeartbeatEvents.heartbeatId, heartbeatId))
      .orderBy(desc(projectHeartbeatEvents.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createProjectHealthLog(logData: any): Promise<any> {
    const [log] = await db
      .insert(projectHealthLog)
      .values(logData)
      .returning();
    return log;
  }

  // Document operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const [doc] = await db.insert(documents).values(document).returning();
    return doc;
  }

  async getDocuments(entityType: string, entityId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(and(eq(documents.entityType, entityType), eq(documents.entityId, entityId)))
      .orderBy(documents.orderIndex, documents.createdAt);
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document> {
    const [doc] = await db
      .update(documents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return doc;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }
}

export const storage = new DatabaseStorage();
