import {
  users,
  workOrders,
  timeEntries,
  messages,
  workOrderTasks,
  type User,
  type UpsertUser,
  type InsertUser,
  type WorkOrder,
  type InsertWorkOrder,
  type TimeEntry,
  type InsertTimeEntry,
  type Message,
  type InsertMessage,
  type WorkOrderTask,
  type InsertWorkOrderTask,
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
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;

  // Work Order operations
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  getWorkOrder(id: string): Promise<WorkOrder | undefined>;
  getWorkOrdersByAssignee(assigneeId: string): Promise<WorkOrder[]>;
  getWorkOrdersByCreator(creatorId: string): Promise<WorkOrder[]>;
  getAllWorkOrders(): Promise<WorkOrder[]>;
  updateWorkOrder(id: string, updates: Partial<InsertWorkOrder>): Promise<WorkOrder>;
  deleteWorkOrder(id: string): Promise<void>;

  // Time Entry operations
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  getActiveTimeEntry(userId: string): Promise<TimeEntry | undefined>;
  getTimeEntriesByUser(userId: string): Promise<TimeEntry[]>;
  getTimeEntriesByWorkOrder(workOrderId: string): Promise<TimeEntry[]>;
  updateTimeEntry(id: string, updates: Partial<InsertTimeEntry>): Promise<TimeEntry>;
  endTimeEntry(id: string, endTime: Date): Promise<TimeEntry>;

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
  getWorkOrderTasks(workOrderId: string): Promise<WorkOrderTask[]>;
  createWorkOrderTask(task: InsertWorkOrderTask): Promise<WorkOrderTask>;
  updateWorkOrderTask(id: string, updates: Partial<InsertWorkOrderTask>): Promise<WorkOrderTask>;
  deleteWorkOrderTask(id: string): Promise<void>;

  // Status and time tracking operations
  updateWorkOrderStatus(id: string, updateData: any): Promise<WorkOrder>;
  startTimeEntry(userId: string, workOrderId: string): Promise<TimeEntry>;
  endActiveTimeEntry(userId: string, workOrderId: string): Promise<TimeEntry | null>;
  markTaskComplete(taskId: string, userId: string): Promise<WorkOrderTask>;
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
    return await db.select().from(users).where(eq(users.role, role));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
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
      id: workOrderId
    }).returning();
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
    const [workOrder] = await db
      .update(workOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workOrders.id, id))
      .returning();
    return workOrder;
  }

  async deleteWorkOrder(id: string): Promise<void> {
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
    const adminCountResult = await db.select({ count: count() }).from(users).where(eq(users.role, 'administrator'));
    const adminCount = adminCountResult[0]?.count || 0;

    const managerCountResult = await db.select({ count: count() }).from(users).where(eq(users.role, 'manager'));
    const managerCount = managerCountResult[0]?.count || 0;

    const agentCountResult = await db.select({ count: count() }).from(users).where(eq(users.role, 'field_agent'));
    const agentCount = agentCountResult[0]?.count || 0;

    return {
      totalUsers,
      activeOrders,
      completedOrders,
      totalOrders,
      adminCount,
      managerCount,
      agentCount,
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
      .where(eq(users.role, 'field_agent'))
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
      .where(eq(users.role, 'field_agent'))
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
}

export const storage = new DatabaseStorage();
