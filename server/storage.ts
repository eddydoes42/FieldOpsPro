import {
  users,
  companies,
  workOrders,
  timeEntries,
  messages,
  workOrderTasks,
  workOrderIssues,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, isNull, isNotNull, count, avg, sum, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
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

  // Time Entry operations
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  getActiveTimeEntry(userId: string): Promise<TimeEntry | undefined>;
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
  updateCompanyRatings(companyId: string): Promise<void>;
  
  // Exclusive Network operations
  createExclusiveNetworkMember(member: InsertExclusiveNetworkMember): Promise<ExclusiveNetworkMember>;
  getExclusiveNetworkMembers(clientCompanyId: string): Promise<ExclusiveNetworkMember[]>;
  getAllExclusiveNetworkMembers(): Promise<ExclusiveNetworkMember[]>;
  updateExclusiveNetworkMember(id: string, updates: Partial<InsertExclusiveNetworkMember>): Promise<ExclusiveNetworkMember>;
  checkExclusiveNetworkEligibility(clientCompanyId: string, serviceCompanyId: string): Promise<boolean>;

  // Project operations
  getProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project>;
  requestProjectAssignment(projectId: string, companyId: string, requestedById: string): Promise<ProjectAssignment>;
  getProjectAssignments(projectId: string): Promise<ProjectAssignment[]>;
  
  // Project Requirements operations
  createProjectRequirement(requirement: InsertProjectRequirement): Promise<ProjectRequirement>;
  getProjectRequirements(projectId: string): Promise<ProjectRequirement[]>;
  updateProjectRequirement(id: string, updates: Partial<InsertProjectRequirement>): Promise<ProjectRequirement>;
  
  // Approval Requests operations
  createApprovalRequest(request: InsertApprovalRequest): Promise<ApprovalRequest>;
  getApprovalRequests(reviewerId: string): Promise<ApprovalRequest[]>;
  reviewApprovalRequest(id: string, status: 'approved' | 'denied', reviewerId: string, response?: string): Promise<ApprovalRequest>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
    // Get all users with field_agent role, including their company information
    const fieldAgentsWithCompanies = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        address: users.address,
        city: users.city,
        state: users.state,
        zipCode: users.zipCode,
        roles: users.roles,
        isActive: users.isActive,
        companyId: users.companyId,
        companyName: companies.name,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(sql`'field_agent' = ANY(${users.roles})`)
      .orderBy(users.firstName, users.lastName);

    // Transform the data to include company information and additional agent details
    return fieldAgentsWithCompanies.map(agent => ({
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
      company: agent.companyName ? {
        id: agent.companyId,
        name: agent.companyName
      } : undefined,
      // Add additional agent-specific fields for talent network
      location: agent.city && agent.state ? `${agent.city}, ${agent.state}` : null,
      specializations: ['Network Installation', 'Hardware Setup'], // TODO: Make this dynamic
      rating: 4.8, // TODO: Calculate from actual ratings
      completedJobs: Math.floor(Math.random() * 50) + 10, // TODO: Get from actual work orders
      yearsExperience: Math.floor(Math.random() * 10) + 2, // TODO: Calculate or store
      certifications: ['CompTIA Network+', 'Cisco CCNA'], // TODO: Make this dynamic
      availability: agent.isActive ? 'Available' : 'Unavailable',
      lastActive: agent.updatedAt?.toISOString() || agent.createdAt?.toISOString()
    } as any));
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
    // First, update all users linked to this company to remove the company association
    await db
      .update(users)
      .set({ companyId: null })
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
  async createWorkOrder(workOrderData: InsertWorkOrder): Promise<WorkOrder> {
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
        communicationRating: Number(avgCommunication.toFixed(2)),
        timelinessRating: Number(avgTimeliness.toFixed(2)),
        workSatisfactionRating: Number(avgWorkSatisfaction.toFixed(2)),
        overallRating: Number(overallRating.toFixed(2)),
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
        communicationRating: Number(avgCommunication.toFixed(2)),
        managementRating: Number(avgManagement.toFixed(2)),
        fieldAgentRating: Number(avgFieldAgent.toFixed(2)),
        overallRating: Number(overallRating.toFixed(2)),
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
        communicationRating: Number(avgCommunication.toFixed(2)),
        clearScopeRating: Number(avgClearScope.toFixed(2)),
        overallSatisfactionRating: Number(avgOverallSatisfaction.toFixed(2)),
        overallRating: Number(overallRating.toFixed(2)),
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
        overallRating: Number(avgRating.toFixed(2)),
        totalRatings: totalRatingsCount,
        updatedAt: new Date()
      }).where(eq(companies.id, companyId));
    }
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
    const serviceCompanies = companies;
    return await db
      .select({
        id: exclusiveNetworkMembers.id,
        clientCompany: {
          id: companies.id,
          name: companies.name,
          type: companies.type
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
      .leftJoin(companies, eq(exclusiveNetworkMembers.clientCompanyId, companies.id))
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
}

export const storage = new DatabaseStorage();
