import {
  users,
  workOrders,
  timeEntries,
  messages,
  type User,
  type UpsertUser,
  type InsertUser,
  type WorkOrder,
  type InsertWorkOrder,
  type TimeEntry,
  type InsertTimeEntry,
  type Message,
  type InsertMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, isNull } from "drizzle-orm";

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
    const [workOrder] = await db.insert(workOrders).values(workOrderData).returning();
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
      .set({ isRead: true })
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  async getAllMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async getDashboardStats() {
    // Get total users count
    const totalUsersResult = await db.select({ count: db.$count() }).from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get work order counts
    const totalOrdersResult = await db.select({ count: db.$count() }).from(workOrders);
    const totalOrders = totalOrdersResult[0]?.count || 0;

    const completedOrdersResult = await db.select({ count: db.$count() }).from(workOrders).where(eq(workOrders.status, 'completed'));
    const completedOrders = completedOrdersResult[0]?.count || 0;

    const activeOrdersResult = await db.select({ count: db.$count() }).from(workOrders).where(or(eq(workOrders.status, 'pending'), eq(workOrders.status, 'in_progress')));
    const activeOrders = activeOrdersResult[0]?.count || 0;

    // Get user role counts
    const adminCountResult = await db.select({ count: db.$count() }).from(users).where(eq(users.role, 'administrator'));
    const adminCount = adminCountResult[0]?.count || 0;

    const managerCountResult = await db.select({ count: db.$count() }).from(users).where(eq(users.role, 'manager'));
    const managerCount = managerCountResult[0]?.count || 0;

    const agentCountResult = await db.select({ count: db.$count() }).from(users).where(eq(users.role, 'field_agent'));
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
}

export const storage = new DatabaseStorage();
