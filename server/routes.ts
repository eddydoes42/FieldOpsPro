import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertUserSchema, insertWorkOrderSchema, insertTimeEntrySchema, insertMessageSchema, insertWorkOrderTaskSchema } from "@shared/schema";
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

  // Team reports route
  app.get('/api/reports/team', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || (currentUser.role !== 'administrator' && currentUser.role !== 'manager')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const reports = await storage.getTeamReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching team reports:", error);
      res.status(500).json({ message: "Failed to fetch team reports" });
    }
  });

  // User management routes - restricted to administrators only for role assignment
  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || currentUser.role !== 'administrator') {
        return res.status(403).json({ message: "Only administrators can create users and assign roles" });
      }

      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Onboarding route - restricted to administrators only for role assignment
  app.post('/api/users/onboard', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || currentUser.role !== 'administrator') {
        return res.status(403).json({ message: "Only administrators can onboard users and assign roles" });
      }

      // Transform onboarding data to user data format
      const onboardingData = req.body;
      const userData: any = {
        id: `agent${Date.now()}`, // Generate a unique ID
        email: onboardingData.email,
        firstName: onboardingData.firstName,
        lastName: onboardingData.lastName,
        role: onboardingData.role || 'field_agent',
        phone: onboardingData.phone || null,
        profileImageUrl: null
      };

      // Add manual login credentials if provided
      if (onboardingData.username && onboardingData.password) {
        // Hash password with bcrypt (need to install bcrypt)
        const bcrypt = require('bcrypt');
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(onboardingData.password, saltRounds);
        
        userData.username = onboardingData.username;
        userData.passwordHash = passwordHash;
        userData.temporaryPassword = onboardingData.temporaryPassword || false;
        userData.mustChangePassword = onboardingData.temporaryPassword || false;
      }

      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error onboarding user:", error);
      res.status(500).json({ message: "Failed to onboard user" });
    }
  });

  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Allow all authenticated users to see basic user info for messaging
      const users = await storage.getAllUsers();
      // Filter out sensitive info for non-admins
      if (currentUser.role !== 'administrator') {
        const filteredUsers = users.map(u => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          email: u.email
        }));
        res.json(filteredUsers);
      } else {
        res.json(users);
      }
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

  // Update work order status
  app.patch("/api/work-orders/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { workStatus } = req.body;
      const userId = req.user.claims.sub;

      // Get current user and work order
      const currentUser = await storage.getUser(userId);
      const workOrder = await storage.getWorkOrder(id);
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Check if user is assigned to this work order or is admin/manager
      const canUpdate = currentUser.role === 'administrator' || 
                       currentUser.role === 'manager' || 
                       workOrder.assigneeId === userId;
      
      if (!canUpdate) {
        return res.status(403).json({ message: "Not authorized to update this work order" });
      }

      const updateData: any = { workStatus };

      // Handle time tracking based on status
      if (workStatus === 'checked_in') {
        updateData.checkedInAt = new Date();
        // Start time tracking
        await storage.startTimeEntry(userId, id);
      } else if (workStatus === 'checked_out') {
        updateData.checkedOutAt = new Date();
        // End time tracking
        await storage.endActiveTimeEntry(userId, id);
      }

      const updatedWorkOrder = await storage.updateWorkOrderStatus(id, updateData);
      res.json(updatedWorkOrder);
    } catch (error) {
      console.error("Error updating work order status:", error);
      res.status(500).json({ message: "Failed to update work order status" });
    }
  });

  // Work Order routes
  app.post('/api/work-orders', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || (currentUser.role !== 'administrator' && currentUser.role !== 'manager')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Transform the data to match schema expectations
      const workOrderData = {
        id: `wo-${Date.now()}`, // Generate unique ID
        title: req.body.title,
        description: req.body.description,
        location: req.body.location || '',
        priority: req.body.priority || 'medium',
        status: 'pending',
        assigneeId: req.body.assignedTo || req.body.assigneeId || null,
        createdById: currentUser.id,
        estimatedHours: req.body.estimatedHours ? req.body.estimatedHours.toString() : null,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        scopeOfWork: req.body.scopeOfWork || null,
        requiredTools: req.body.requiredTools || null,
        pointOfContact: req.body.pointOfContact || null,
      };
      const workOrder = await storage.createWorkOrder(workOrderData);
      res.json(workOrder);
    } catch (error) {
      console.error("Error creating work order:", error);
      res.status(500).json({ message: "Failed to create work order" });
    }
  });

  // Update work order
  app.put('/api/work-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || (currentUser.role !== 'administrator' && currentUser.role !== 'manager')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { id } = req.params;
      const updates = {
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority,
        assigneeId: req.body.assignedTo,
        estimatedHours: req.body.estimatedHours ? req.body.estimatedHours.toString() : null,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        scopeOfWork: req.body.scopeOfWork,
        requiredTools: req.body.requiredTools,
        pointOfContact: req.body.pointOfContact,
        updatedAt: new Date(),
      };

      const updatedWorkOrder = await storage.updateWorkOrder(id, updates);
      res.json(updatedWorkOrder);
    } catch (error) {
      console.error("Error updating work order:", error);
      res.status(500).json({ message: "Failed to update work order" });
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

  // Messages routes
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const messageData = {
        id: `msg-${Date.now()}`,
        senderId: currentUser.id,
        recipientId: req.body.recipientId || null,
        workOrderId: req.body.workOrderId || null,
        subject: req.body.subject || '',
        content: req.body.content,
        priority: req.body.priority || 'normal',
        isRead: false,
        readAt: null,
        messageType: req.body.messageType || 'direct',
        createdAt: new Date(),
      };

      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const messages = await storage.getUserMessages(currentUser.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.patch('/api/messages/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const message = await storage.getMessage(req.params.id);
      if (!message || message.recipientId !== currentUser.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedMessage = await storage.markMessageAsRead(req.params.id);
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  // Time Entry routes
  app.post('/api/time-entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Convert startTime from ISO string to Date object
      const startTime = req.body.startTime ? new Date(req.body.startTime) : new Date();
      
      const timeEntryData = insertTimeEntrySchema.parse({
        ...req.body,
        userId,
        startTime,
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

  // Work Order Task routes
  app.post('/api/work-orders/:workOrderId/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || (currentUser.role !== 'administrator' && currentUser.role !== 'manager')) {
        return res.status(403).json({ message: "Only administrators and managers can create tasks" });
      }

      const taskData = insertWorkOrderTaskSchema.parse({
        ...req.body,
        workOrderId: req.params.workOrderId,
      });

      const task = await storage.createWorkOrderTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error creating work order task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.get('/api/work-orders/:workOrderId/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const tasks = await storage.getWorkOrderTasks(req.params.workOrderId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching work order tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.patch('/api/tasks/:taskId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Allow assigned agent or managers to mark tasks complete
      if (currentUser.role !== 'administrator' && currentUser.role !== 'manager') {
        // Check if user is assigned to the work order
        const tasks = await storage.getWorkOrderTasks(req.body.workOrderId);
        const task = tasks.find(t => t.id === req.params.taskId);
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }

        const workOrder = await storage.getWorkOrder(task.workOrderId);
        if (!workOrder || workOrder.assigneeId !== currentUser.id) {
          return res.status(403).json({ message: "Only assigned agents and managers can complete tasks" });
        }
      }

      const completedTask = await storage.markTaskComplete(req.params.taskId, currentUser.id);
      res.json(completedTask);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  app.patch('/api/tasks/:taskId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || (currentUser.role !== 'administrator' && currentUser.role !== 'manager')) {
        return res.status(403).json({ message: "Only administrators and managers can update tasks" });
      }

      const updates = req.body;
      const updatedTask = await storage.updateWorkOrderTask(req.params.taskId, updates);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Work Order Tasks Management
  app.get("/api/work-orders/:workOrderId/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const { workOrderId } = req.params;
      const tasks = await storage.getWorkOrderTasks(workOrderId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching work order tasks:", error);
      res.status(500).json({ message: "Failed to fetch work order tasks" });
    }
  });

  app.post("/api/work-orders/:workOrderId/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const { workOrderId } = req.params;
      const taskData = { 
        ...req.body, 
        workOrderId,
        id: `task-${Date.now()}`,
      };
      
      const task = await storage.createWorkOrderTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating work order task:", error);
      res.status(500).json({ message: "Failed to create work order task" });
    }
  });

  app.patch("/api/work-order-tasks/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const userId = req.user?.claims?.sub;
      
      const updateData = {
        ...req.body,
        completedById: req.body.isCompleted ? userId : null,
        completedAt: req.body.isCompleted ? new Date() : null,
      };
      
      const task = await storage.updateWorkOrderTask(taskId, updateData);
      res.json(task);
    } catch (error) {
      console.error("Error updating work order task:", error);
      res.status(500).json({ message: "Failed to update work order task" });
    }
  });

  app.delete("/api/work-order-tasks/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      await storage.deleteWorkOrderTask(taskId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting work order task:", error);
      res.status(500).json({ message: "Failed to delete work order task" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
