import {
  users,
  companies,
  workOrders,
  timeEntries,
  messages,
  workOrderTasks,
  workOrderIssues,
  notifications,
  clientServiceRatings,
  serviceClientRatings,
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
  type ClientServiceRating,
  type InsertClientServiceRating,
  type ServiceClientRating,
  type InsertServiceClientRating,
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

  // Rating operations
  createClientServiceRating(rating: InsertClientServiceRating): Promise<ClientServiceRating>;
  createServiceClientRating(rating: InsertServiceClientRating): Promise<ServiceClientRating>;
  getClientServiceRating(workOrderId: string, clientId: string): Promise<ClientServiceRating | undefined>;
  getServiceClientRating(workOrderId: string, raterId: string): Promise<ServiceClientRating | undefined>;
  getServiceCompanyRatings(companyId: string): Promise<ClientServiceRating[]>;
  getClientRatings(clientId: string): Promise<ServiceClientRating[]>;
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

  async getActiveTimeEntry(userId: string): Promise<TimeEntry | undefined> {
    const [activeEntry] = await db
      .select()
      .from(timeEntries)
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



  async getDashboardStats() {
    // Get total users count
    const totalUsersResult = await db.select({ count: count() }).from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get work order counts
    const totalOrdersResult = await db.select({ count: count() }).from(workOrders);
    const totalOrders = totalOrdersResult[0]?.count || 0;

    const completedOrdersResult = await db.select({ count: count() }).from(workOrders).where(eq(workOrders.status, 'completed'));
    const completedOrders = completedOrdersResult[0]?.count || 0;

    const activeOrdersResult = await db.select({ count: count() }).from(workOrders).where(or(eq(workOrders.status, 'pending'), eq(workOrders.status, 'in_progress')));
    const activeOrders = activeOrdersResult[0]?.count || 0;

    // Get user role counts
    const adminCountResult = await db.select({ count: count() }).from(users).where(sql`'administrator' = ANY(${users.roles})`);
    const adminCount = adminCountResult[0]?.count || 0;

    const managerCountResult = await db.select({ count: count() }).from(users).where(sql`'manager' = ANY(${users.roles})`);
    const managerCount = managerCountResult[0]?.count || 0;

    const agentCountResult = await db.select({ count: count() }).from(users).where(sql`'field_agent' = ANY(${users.roles})`);
    const agentCount = agentCountResult[0]?.count || 0;

    const clientCountResult = await db.select({ count: count() }).from(users).where(sql`'client' = ANY(${users.roles})`);
    const clientCount = clientCountResult[0]?.count || 0;

    return {
      totalUsers,
      activeOrders,
      completedOrders,
      totalOrders,
      adminCount,
      managerCount,
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

  async getFieldAgents(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(sql`'field_agent' = ANY(roles)`)
      .orderBy(users.firstName, users.lastName);
  }

  // Rating operations
  async createClientServiceRating(rating: InsertClientServiceRating): Promise<ClientServiceRating> {
    const [newRating] = await db
      .insert(clientServiceRatings)
      .values(rating)
      .returning();
    return newRating;
  }

  async createServiceClientRating(rating: InsertServiceClientRating): Promise<ServiceClientRating> {
    const [newRating] = await db
      .insert(serviceClientRatings)
      .values(rating)
      .returning();
    return newRating;
  }

  async getClientServiceRating(workOrderId: string, clientId: string): Promise<ClientServiceRating | undefined> {
    const [rating] = await db
      .select()
      .from(clientServiceRatings)
      .where(and(
        eq(clientServiceRatings.workOrderId, workOrderId),
        eq(clientServiceRatings.clientId, clientId)
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

  async getServiceCompanyRatings(companyId: string): Promise<ClientServiceRating[]> {
    return await db
      .select({
        ...clientServiceRatings,
        workOrder: {
          id: workOrders.id,
          title: workOrders.title,
          dueDate: workOrders.dueDate
        },
        client: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          clientCompanyName: users.clientCompanyName
        }
      })
      .from(clientServiceRatings)
      .leftJoin(workOrders, eq(clientServiceRatings.workOrderId, workOrders.id))
      .leftJoin(users, eq(clientServiceRatings.clientId, users.id))
      .where(eq(clientServiceRatings.companyId, companyId))
      .orderBy(desc(clientServiceRatings.createdAt));
  }

  async getClientRatings(clientId: string): Promise<ServiceClientRating[]> {
    return await db
      .select({
        ...serviceClientRatings,
        workOrder: {
          id: workOrders.id,
          title: workOrders.title,
          dueDate: workOrders.dueDate
        },
        rater: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(serviceClientRatings)
      .leftJoin(workOrders, eq(serviceClientRatings.workOrderId, workOrders.id))
      .leftJoin(users, eq(serviceClientRatings.raterId, users.id))
      .where(eq(serviceClientRatings.clientId, clientId))
      .orderBy(desc(serviceClientRatings.createdAt));
  }
}

export const storage = new DatabaseStorage();
