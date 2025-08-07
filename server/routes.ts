import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertUserSchema, insertWorkOrderSchema, insertTimeEntrySchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard statistics route
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || currentUser.role !== 'administrator') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // User management routes
  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || (currentUser.role !== 'administrator' && currentUser.role !== 'manager')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || currentUser.role !== 'administrator') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/users/role/:role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || (currentUser.role !== 'administrator' && currentUser.role !== 'manager')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const users = await storage.getUsersByRole(req.params.role);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users by role:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Work Order routes
  app.post('/api/work-orders', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || (currentUser.role !== 'administrator' && currentUser.role !== 'manager')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const workOrderData = insertWorkOrderSchema.parse({
        ...req.body,
        createdById: currentUser.id,
      });
      const workOrder = await storage.createWorkOrder(workOrderData);
      res.json(workOrder);
    } catch (error) {
      console.error("Error creating work order:", error);
      res.status(500).json({ message: "Failed to create work order" });
    }
  });

  app.get('/api/work-orders', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      let workOrders;
      if (currentUser.role === 'administrator') {
        workOrders = await storage.getAllWorkOrders();
      } else if (currentUser.role === 'manager') {
        workOrders = await storage.getWorkOrdersByCreator(currentUser.id);
      } else {
        workOrders = await storage.getWorkOrdersByAssignee(currentUser.id);
      }

      res.json(workOrders);
    } catch (error) {
      console.error("Error fetching work orders:", error);
      res.status(500).json({ message: "Failed to fetch work orders" });
    }
  });

  app.get('/api/work-orders/assigned', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workOrders = await storage.getWorkOrdersByAssignee(userId);
      res.json(workOrders);
    } catch (error) {
      console.error("Error fetching assigned work orders:", error);
      res.status(500).json({ message: "Failed to fetch work orders" });
    }
  });

  app.patch('/api/work-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      const workOrder = await storage.getWorkOrder(req.params.id);
      
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Check permissions
      const canUpdate = currentUser?.role === 'administrator' || 
                       workOrder.createdById === currentUser?.id || 
                       workOrder.assigneeId === currentUser?.id;

      if (!canUpdate) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const updates = req.body;
      const updatedWorkOrder = await storage.updateWorkOrder(req.params.id, updates);
      res.json(updatedWorkOrder);
    } catch (error) {
      console.error("Error updating work order:", error);
      res.status(500).json({ message: "Failed to update work order" });
    }
  });

  // Time Entry routes
  app.post('/api/time-entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const timeEntryData = insertTimeEntrySchema.parse({
        ...req.body,
        userId,
      });

      // End any active time entry first
      const activeEntry = await storage.getActiveTimeEntry(userId);
      if (activeEntry) {
        await storage.endTimeEntry(activeEntry.id, new Date());
      }

      const timeEntry = await storage.createTimeEntry(timeEntryData);
      res.json(timeEntry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      res.status(500).json({ message: "Failed to create time entry" });
    }
  });

  app.get('/api/time-entries/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const activeEntry = await storage.getActiveTimeEntry(userId);
      res.json(activeEntry);
    } catch (error) {
      console.error("Error fetching active time entry:", error);
      res.status(500).json({ message: "Failed to fetch active time entry" });
    }
  });

  app.get('/api/time-entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const timeEntries = await storage.getTimeEntriesByUser(userId);
      res.json(timeEntries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.patch('/api/time-entries/:id/end', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const timeEntry = await storage.endTimeEntry(req.params.id, new Date());
      res.json(timeEntry);
    } catch (error) {
      console.error("Error ending time entry:", error);
      res.status(500).json({ message: "Failed to end time entry" });
    }
  });

  // Message routes
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const senderId = req.user.claims.sub;
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId,
      });

      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.get('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messages = await storage.getMessagesByRecipient(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.patch('/api/messages/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const message = await storage.markMessageAsRead(req.params.id);
      res.json(message);
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Dashboard stats routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || currentUser.role !== 'administrator') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const [allUsers, allWorkOrders, allTimeEntries] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllWorkOrders(),
        storage.getTimeEntriesByUser(currentUser.id),
      ]);

      const stats = {
        totalUsers: allUsers.length,
        activeOrders: allWorkOrders.filter(order => order.status === 'in_progress' || order.status === 'pending').length,
        completedOrders: allWorkOrders.filter(order => order.status === 'completed').length,
        totalOrders: allWorkOrders.length,
        adminCount: allUsers.filter(user => user.role === 'administrator').length,
        managerCount: allUsers.filter(user => user.role === 'manager').length,
        agentCount: allUsers.filter(user => user.role === 'field_agent').length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
