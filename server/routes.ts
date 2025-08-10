import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertUserSchema, insertCompanySchema, insertWorkOrderSchema, insertTimeEntrySchema, insertMessageSchema, insertWorkOrderTaskSchema, insertClientServiceRatingSchema, insertServiceClientRatingSchema, isAdmin, hasAnyRole, canManageUsers, canManageWorkOrders, canViewBudgets, canViewAllOrders, isOperationsDirector, isClient } from "@shared/schema";
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
      if (!currentUser || !isAdmin(currentUser)) {
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
      if (!currentUser || (!hasAnyRole(currentUser, ['administrator', 'manager']))) {
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
      if (!currentUser || !isAdmin(currentUser)) {
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
      if (!currentUser || !isAdmin(currentUser)) {
        return res.status(403).json({ message: "Only administrators can onboard users and assign roles" });
      }

      // Transform onboarding data to user data format
      const onboardingData = req.body;
      const userData: any = {
        id: `agent${Date.now()}`, // Generate a unique ID
        email: onboardingData.email,
        firstName: onboardingData.firstName,
        lastName: onboardingData.lastName,
        roles: onboardingData.roles || ['field_agent'],
        phone: onboardingData.phone || null,
        profileImageUrl: null,
        // Associate with company if provided
        companyId: onboardingData.companyId || null
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

  // Delete user route - restricted to administrators and managers
  app.delete('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !canManageUsers(currentUser)) {
        return res.status(403).json({ message: "Only administrators and managers can delete users" });
      }

      const userIdToDelete = req.params.id;
      
      // Prevent deleting oneself
      if (userIdToDelete === currentUser!.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      // Check if user exists
      const userToDelete = await storage.getUser(userIdToDelete);
      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only administrators can delete other administrators
      if (hasAnyRole(userToDelete, ['administrator']) && !isAdmin(currentUser!)) {
        return res.status(403).json({ message: "Only administrators can delete other administrators" });
      }

      await storage.deleteUser(userIdToDelete);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
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
      if (!isAdmin(currentUser!)) {
        const filteredUsers = users.map(u => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          roles: u.roles,
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

  // Field agents route - get all field agents for talent network (accessible to clients)
  app.get('/api/users/field-agents', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Allow access to clients and service company roles
      const hasAccess = hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher', 'client']) || 
                       isClient(currentUser);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const fieldAgents = await storage.getFieldAgents();
      res.json(fieldAgents);
    } catch (error) {
      console.error("Error fetching field agents:", error);
      res.status(500).json({ message: "Failed to fetch field agents" });
    }
  });

  app.get('/api/users/role/:role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || (!hasAnyRole(currentUser, ['administrator', 'manager']))) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const users = await storage.getUsersByRole(req.params.role);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users by role:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user information - restricted access for role changes
  app.patch('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const userIdToUpdate = req.params.id;
      const updateData = req.body;

      if (!currentUser) {
        return res.status(404).json({ message: "Current user not found" });
      }

      // Check if user exists
      const userToUpdate = await storage.getUser(userIdToUpdate);
      if (!userToUpdate) {
        return res.status(404).json({ message: "User not found" });
      }

      // Permission checks for different types of updates
      const isUpdatingRoles = 'roles' in updateData;
      const isUpdatingStatus = 'isActive' in updateData || 'isSuspended' in updateData;
      const isUpdatingContactInfo = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode'].some(field => field in updateData);

      // Role updates: Only administrators can change roles, and only up to their own level
      if (isUpdatingRoles) {
        console.log(`Role update attempt: Current user (${currentUser.id}) trying to update user ${userIdToUpdate} roles to "${updateData.roles}"`);
        if (!isAdmin(currentUser!)) {
          return res.status(403).json({ message: "Only administrators can assign roles" });
        }
        
        // Prevent elevating to administrator unless current user is administrator
        if (updateData.roles && updateData.roles.includes('administrator') && !isAdmin(currentUser!)) {
          return res.status(403).json({ message: "Cannot promote users to administrator" });
        }
      }

      // Status updates: Administrators and managers can update status
      if (isUpdatingStatus) {
        if (!canManageUsers(currentUser!)) {
          return res.status(403).json({ message: "Only administrators and managers can update user status" });
        }
      }

      // Contact info updates: Administrators and managers can update any user, users can update themselves
      if (isUpdatingContactInfo) {
        const canUpdateContactInfo = canManageUsers(currentUser!) || currentUser!.id === userIdToUpdate;
        
        if (!canUpdateContactInfo) {
          return res.status(403).json({ message: "Insufficient permissions to update contact information" });
        }
      }

      // Prevent users from updating their own roles or status (except contact info)
      if (currentUser!.id === userIdToUpdate && (isUpdatingRoles || isUpdatingStatus)) {
        return res.status(403).json({ message: "Cannot modify your own roles or status" });
      }

      // Update the user
      const updatedUser = await storage.updateUser(userIdToUpdate, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Confirm scheduled work order
  app.patch("/api/work-orders/:id/confirm", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
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

      // Check authorization for work order confirmation
      const canConfirm = (hasAnyRole(currentUser!, ['field_agent']) && workOrder.assigneeId === userId) ||
                         canManageWorkOrders(currentUser!);
      
      if (!canConfirm) {
        return res.status(403).json({ message: "Only assigned field agents, administrators, managers, or dispatchers can confirm work orders" });
      }

      // Only scheduled work orders can be confirmed
      if (workOrder.status !== 'scheduled') {
        return res.status(400).json({ message: "Only scheduled work orders can be confirmed" });
      }

      const updateData = {
        status: 'confirmed',
        confirmedAt: new Date(),
      };

      const updatedWorkOrder = await storage.updateWorkOrderStatus(id, updateData);
      res.json(updatedWorkOrder);
    } catch (error) {
      console.error("Error confirming work order:", error);
      res.status(500).json({ message: "Failed to confirm work order" });
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

      // Check if user is assigned to this work order or has management privileges
      const canUpdate = canManageWorkOrders(currentUser!) || workOrder.assigneeId === userId;
      
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
      } else if (workStatus === 'completed') {
        // Before marking as complete, verify all tasks are completed
        const tasks = await storage.getWorkOrderTasks(id);
        if (tasks.length > 0) {
          const incompleteTasks = tasks.filter(task => !task.isCompleted);
          if (incompleteTasks.length > 0) {
            return res.status(400).json({ 
              message: `Cannot mark work order as complete. ${incompleteTasks.length} task(s) still incomplete.`,
              incompleteTasks: incompleteTasks.map(t => t.title)
            });
          }
        }
        updateData.completedAt = new Date();
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
      console.log("Work order creation - User:", currentUser?.email, "Roles:", currentUser?.roles);
      console.log("canManageUsers:", canManageUsers(currentUser), "isClient:", isClient(currentUser));
      
      // Allow management users, clients, and operations directors to create work orders
      if (!currentUser || (!canManageUsers(currentUser) && !isClient(currentUser) && !isOperationsDirector(currentUser || null))) {
        console.log("Permission denied for work order creation");
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Transform the data to match schema expectations
      // Check if this should be treated as a client-created work order
      // (either user is actual client OR operations director testing client role via UI)
      const isClientUser = isClient(currentUser) || (isOperationsDirector(currentUser) && req.body.isClientCreated);
      const workOrderData = {
        id: `wo-${Date.now()}`, // Generate unique ID
        title: req.body.title,
        description: req.body.description,
        companyId: 'default-company-id', // Add required companyId field
        location: req.body.location || '',
        priority: req.body.priority || 'medium',
        status: 'pending', // Default status for new work orders
        assigneeId: isClientUser ? null : (req.body.assignedTo || req.body.assigneeId || null), // Clients can't assign
        createdById: currentUser!.id,
        estimatedHours: req.body.estimatedHours ? req.body.estimatedHours.toString() : null,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        scopeOfWork: req.body.scopeOfWork || null,
        requiredTools: req.body.requiredTools || null,
        pointOfContact: isClientUser ? null : (req.body.pointOfContact || null), // Clients can't set POC
        isClientCreated: isClientUser, // Mark client-created work orders
        // Budget information - available to both management and clients
        budgetType: req.body.budgetType || null,
        budgetAmount: req.body.budgetAmount ? req.body.budgetAmount.toString() : null,
        devicesInstalled: req.body.devicesInstalled ? parseInt(req.body.devicesInstalled) : null,
        budgetCreatedById: req.body.budgetType ? currentUser!.id : null,
        budgetCreatedAt: req.body.budgetType ? new Date() : null,
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
      if (!currentUser || !canManageUsers(currentUser)) {
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
      if (canViewAllOrders(currentUser!)) {
        workOrders = await storage.getAllWorkOrders();
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
      const canUpdate = (currentUser && isAdmin(currentUser)) || 
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

  // Update work order payment status - only administrators can update
  app.patch('/api/work-orders/:id/payment-status', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isAdmin(currentUser)) {
        return res.status(403).json({ message: "Only administrators can update payment status" });
      }

      const { id } = req.params;
      const { paymentStatus } = req.body;
      
      // Validate payment status
      const validStatuses = ['pending_payment', 'payment_approved', 'payment_received', 'paid'];
      if (!validStatuses.includes(paymentStatus)) {
        return res.status(400).json({ message: "Invalid payment status" });
      }

      const workOrder = await storage.getWorkOrder(id);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Only allow payment status updates for completed work orders
      if (workOrder.status !== 'completed') {
        return res.status(400).json({ message: "Payment status can only be updated for completed work orders" });
      }

      const updates = {
        paymentStatus,
        paymentUpdatedById: currentUser.id,
        paymentUpdatedAt: new Date(),
      };

      const updatedWorkOrder = await storage.updateWorkOrder(id, updates);
      res.json(updatedWorkOrder);
    } catch (error) {
      console.error("Error updating payment status:", error);
      res.status(500).json({ message: "Failed to update payment status" });
    }
  });

  // Delete work order route - only administrators and managers can delete
  app.delete('/api/work-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!canManageUsers(currentUser || null)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { id } = req.params;
      const workOrder = await storage.getWorkOrder(id);
      
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      await storage.deleteWorkOrder(id);
      res.json({ message: "Work order deleted successfully" });
    } catch (error) {
      console.error("Error deleting work order:", error);
      res.status(500).json({ message: "Failed to delete work order" });
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
      if (!isAdmin(currentUser || null)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const [allUsers, allWorkOrders, allTimeEntries] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllWorkOrders(),
        storage.getTimeEntriesByUser(currentUser?.id || ''),
      ]);

      const stats = {
        totalUsers: allUsers.length,
        activeOrders: allWorkOrders.filter(order => order.status === 'in_progress' || order.status === 'confirmed' || order.status === 'scheduled').length,
        completedOrders: allWorkOrders.filter(order => order.status === 'completed').length,
        totalOrders: allWorkOrders.length,
        adminCount: allUsers.filter(user => hasAnyRole(user, ['administrator'])).length,
        managerCount: allUsers.filter(user => hasAnyRole(user, ['manager'])).length,
        agentCount: allUsers.filter(user => hasAnyRole(user, ['field_agent'])).length,
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
      if (!canManageUsers(currentUser || null)) {
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

      // Get the task first
      const task = await storage.getWorkOrderTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Allow assigned agent or managers to mark tasks complete
      if (!canManageUsers(currentUser)) {
        // Check if user is assigned to the work order
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
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get the task to check work order assignment
      const task = await storage.getWorkOrderTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Get the work order to check assignment
      const workOrder = await storage.getWorkOrder(task.workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Check permissions: admins/managers can update any task, field agents can only update tasks for their assigned work orders
      const canUpdate = canManageUsers(currentUser) || workOrder.assigneeId === currentUser.id;

      if (!canUpdate) {
        return res.status(403).json({ message: "Not authorized to update this task" });
      }

      const updates = req.body;
      
      // If it's a completion update by a field agent, add completedById
      if (updates.isCompleted && hasAnyRole(currentUser, ['field_agent'])) {
        updates.completedById = currentUser.id;
        updates.completedAt = new Date();
      }

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

  // Time tracking routes
  app.get('/api/work-orders/:workOrderId/time-entries', isAuthenticated, async (req: any, res) => {
    try {
      const { workOrderId } = req.params;
      const timeEntries = await storage.getTimeEntriesByWorkOrder(workOrderId);
      res.json(timeEntries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.get('/api/users/:userId/time-entries', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      const { userId } = req.params;
      
      // Users can only view their own time entries unless they're admins/managers
      if (currentUser?.id !== userId && !canManageUsers(currentUser || null)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const timeEntries = await storage.getTimeEntriesByUser(userId);
      res.json(timeEntries);
    } catch (error) {
      console.error("Error fetching user time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  // Work Order Issues Management
  app.get("/api/work-orders/:workOrderId/issues", isAuthenticated, async (req: any, res) => {
    try {
      const { workOrderId } = req.params;
      const issues = await storage.getWorkOrderIssues(workOrderId);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching work order issues:", error);
      res.status(500).json({ message: "Failed to fetch work order issues" });
    }
  });

  app.post("/api/work-orders/:workOrderId/issues", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { workOrderId } = req.params;
      const issueData = {
        ...req.body,
        workOrderId,
        createdById: currentUser.id,
      };

      const issue = await storage.createWorkOrderIssue(issueData);
      res.json(issue);
    } catch (error) {
      console.error("Error creating work order issue:", error);
      res.status(500).json({ message: "Failed to create issue" });
    }
  });

  app.get("/api/issues", isAuthenticated, async (req: any, res) => {
    try {
      const issues = await storage.getAllIssues();
      res.json(issues);
    } catch (error) {
      console.error("Error fetching all issues:", error);
      res.status(500).json({ message: "Failed to fetch issues" });
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

  // Work Order Budget Management - Manager Only
  app.post("/api/work-orders/:workOrderId/budget", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!canManageUsers(currentUser || null)) {
        return res.status(403).json({ message: "Only managers and administrators can create work order budgets" });
      }

      const { workOrderId } = req.params;
      const { budgetType, budgetAmount, devicesInstalled } = req.body;

      // Validate budget type
      if (!['fixed', 'hourly', 'per_device'].includes(budgetType)) {
        return res.status(400).json({ message: "Invalid budget type. Must be 'fixed', 'hourly', or 'per_device'" });
      }

      // Validate required fields
      if (!budgetAmount || budgetAmount <= 0) {
        return res.status(400).json({ message: "Budget amount is required and must be greater than 0" });
      }

      if (budgetType === 'per_device' && (!devicesInstalled || devicesInstalled <= 0)) {
        return res.status(400).json({ message: "Devices installed is required for per-device budget type" });
      }

      const budgetData = {
        budgetType,
        budgetAmount: budgetAmount.toString(),
        devicesInstalled: budgetType === 'per_device' ? devicesInstalled : null,
        budgetCreatedById: currentUser?.id || '',
        budgetCreatedAt: new Date(),
      };

      const updatedWorkOrder = await storage.updateWorkOrder(workOrderId, budgetData);
      res.json(updatedWorkOrder);
    } catch (error) {
      console.error("Error creating work order budget:", error);
      res.status(500).json({ message: "Failed to create work order budget" });
    }
  });

  app.put("/api/work-orders/:workOrderId/budget", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!canManageUsers(currentUser || null)) {
        return res.status(403).json({ message: "Only managers and administrators can update work order budgets" });
      }

      const { workOrderId } = req.params;
      const { budgetType, budgetAmount, devicesInstalled } = req.body;

      // Validate budget type
      if (!['fixed', 'hourly', 'per_device'].includes(budgetType)) {
        return res.status(400).json({ message: "Invalid budget type. Must be 'fixed', 'hourly', or 'per_device'" });
      }

      // Validate required fields
      if (!budgetAmount || budgetAmount <= 0) {
        return res.status(400).json({ message: "Budget amount is required and must be greater than 0" });
      }

      if (budgetType === 'per_device' && (!devicesInstalled || devicesInstalled <= 0)) {
        return res.status(400).json({ message: "Devices installed is required for per-device budget type" });
      }

      const budgetData = {
        budgetType,
        budgetAmount: budgetAmount.toString(),
        devicesInstalled: budgetType === 'per_device' ? devicesInstalled : null,
        budgetCreatedById: currentUser?.id || '',
        budgetCreatedAt: new Date(),
      };

      const updatedWorkOrder = await storage.updateWorkOrder(workOrderId, budgetData);
      res.json(updatedWorkOrder);
    } catch (error) {
      console.error("Error updating work order budget:", error);
      res.status(500).json({ message: "Failed to update work order budget" });
    }
  });

  app.get("/api/work-orders/:workOrderId/budget-calculation", isAuthenticated, async (req: any, res) => {
    try {
      const { workOrderId } = req.params;
      const workOrder = await storage.getWorkOrder(workOrderId);
      
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      if (!workOrder.budgetType || !workOrder.budgetAmount) {
        return res.status(404).json({ message: "No budget set for this work order" });
      }

      let calculatedBudget = parseFloat(workOrder.budgetAmount);
      let details: any = { baseAmount: calculatedBudget, multiplier: 1, total: calculatedBudget };

      if (workOrder.budgetType === 'hourly') {
        // Get total logged time for this work order  
        const timeEntries = await storage.getTimeEntriesByWorkOrder(workOrderId);
        const totalHours = timeEntries.reduce((total: number, entry: any) => {
          if (entry.endTime) {
            const hours = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60);
            return total + hours;
          }
          return total;
        }, 0);
        
        calculatedBudget = parseFloat(workOrder.budgetAmount) * totalHours;
        details = { 
          baseAmount: parseFloat(workOrder.budgetAmount), 
          multiplier: totalHours, 
          total: calculatedBudget,
          type: 'hourly',
          loggedHours: totalHours
        };
      } else if (workOrder.budgetType === 'per_device') {
        const devices = workOrder.devicesInstalled || 0;
        calculatedBudget = parseFloat(workOrder.budgetAmount) * devices;
        details = { 
          baseAmount: parseFloat(workOrder.budgetAmount), 
          multiplier: devices, 
          total: calculatedBudget,
          type: 'per_device',
          devicesInstalled: devices
        };
      } else {
        details = {
          baseAmount: calculatedBudget,
          multiplier: 1,
          total: calculatedBudget,
          type: 'fixed'
        };
      }

      res.json({
        workOrderId,
        budgetType: workOrder.budgetType,
        ...details
      });
    } catch (error) {
      console.error("Error calculating work order budget:", error);
      res.status(500).json({ message: "Failed to calculate work order budget" });
    }
  });

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUnreadNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  app.post("/api/notifications/:id/confirm", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { workOrderId } = req.body;
      
      const workOrder = await storage.confirmWorkOrderNotification(id, workOrderId);
      res.json(workOrder);
    } catch (error) {
      console.error("Error confirming work order:", error);
      res.status(500).json({ message: "Failed to confirm work order" });
    }
  });

  app.patch("/api/notifications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const notification = await storage.updateNotification(id, updates);
      res.json(notification);
    } catch (error) {
      console.error("Error updating notification:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  // Company routes - restricted to operations directors
  app.get('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ message: "Operations Director access required" });
      }

      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.post('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ message: "Operations Director access required" });
      }

      const companyData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(companyData);
      res.json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.patch('/api/companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ message: "Operations Director access required" });
      }

      const companyId = req.params.id;
      const updateData = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(companyId, updateData);
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  app.delete('/api/companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isAdmin(currentUser)) {
        return res.status(403).json({ message: "Administrator access required" });
      }

      const companyId = req.params.id;
      await storage.deleteCompany(companyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // Operations Director statistics
  app.get('/api/operations/stats', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ message: "Operations Director access required" });
      }

      const stats = await storage.getOperationsStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching operations stats:", error);
      res.status(500).json({ message: "Failed to fetch operations stats" });
    }
  });

  // Get all administrators for operations dashboard
  app.get('/api/operations/admins', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ message: "Operations Director access required" });
      }

      const admins = await storage.getOperationsAdmins();
      res.json(admins);
    } catch (error) {
      console.error("Error fetching operations admins:", error);
      res.status(500).json({ message: "Failed to fetch admins" });
    }
  });

  // Get recently onboarded users for operations dashboard
  app.get('/api/operations/recent-users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ message: "Operations Director access required" });
      }

      const recentUsers = await storage.getRecentUsers();
      res.json(recentUsers);
    } catch (error) {
      console.error("Error fetching recent users:", error);
      res.status(500).json({ message: "Failed to fetch recent users" });
    }
  });

  // Get budget summary for operations dashboard
  app.get('/api/operations/budget-summary', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ message: "Operations Director access required" });
      }

      const workOrders = await storage.getAllWorkOrders();
      let totalEarned = 0;
      let todayEarning = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const workOrder of workOrders) {
        if (!workOrder.budgetType || !workOrder.budgetAmount) continue;

        let calculatedBudget = parseFloat(workOrder.budgetAmount);

        if (workOrder.budgetType === 'hourly') {
          // Get total logged time for this work order  
          const timeEntries = await storage.getTimeEntriesByWorkOrder(workOrder.id);
          const totalHours = timeEntries.reduce((total: number, entry: any) => {
            if (entry.endTime) {
              const hours = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60);
              return total + hours;
            }
            return total;
          }, 0);
          calculatedBudget = parseFloat(workOrder.budgetAmount) * totalHours;
        } else if (workOrder.budgetType === 'per_device') {
          const devices = workOrder.devicesInstalled || 0;
          calculatedBudget = parseFloat(workOrder.budgetAmount) * devices;
        }

        // Add to total if work order is completed
        if (workOrder.status === 'completed') {
          totalEarned += calculatedBudget;
        }

        // Add to today's earning if work order is due today
        if (workOrder.dueDate) {
          const dueDate = new Date(workOrder.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate.getTime() === today.getTime()) {
            todayEarning += calculatedBudget;
          }
        }
      }

      res.json({
        totalEarned: Math.round(totalEarned * 100) / 100,
        todayEarning: Math.round(todayEarning * 100) / 100
      });
    } catch (error) {
      console.error("Error fetching budget summary:", error);
      res.status(500).json({ message: "Failed to fetch budget summary" });
    }
  });

  // Onboard admin for a company - restricted to operations directors
  app.post('/api/users/onboard-admin', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ message: "Operations Director access required" });
      }

      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error onboarding admin:", error);
      res.status(500).json({ message: "Failed to onboard admin" });
    }
  });

  // Get company statistics - restricted to operations directors
  app.get('/api/companies/:companyId/stats', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ message: "Operations Director access required" });
      }

      const { companyId } = req.params;
      const stats = await storage.getCompanyStats(companyId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching company stats:", error);
      res.status(500).json({ message: "Failed to fetch company stats" });
    }
  });

  // ===== RATING SYSTEM ROUTES =====

  // Client rating service company
  app.post('/api/ratings/client-service', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !isClient(currentUser)) {
        return res.status(403).json({ message: "Access denied. Client role required." });
      }

      // Get work order details to populate rating data
      const workOrder = await storage.getWorkOrder(req.body.workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Check if rating already exists
      const existingRating = await storage.getClientServiceRating(req.body.workOrderId, userId);
      if (existingRating) {
        return res.status(400).json({ message: "Rating already exists for this work order" });
      }

      const ratingData = insertClientServiceRatingSchema.parse({
        ...req.body,
        clientId: userId,
        companyId: workOrder.companyId,
        fieldAgentId: workOrder.assigneeId,
        // These would be populated based on work order management assignments
        managerId: workOrder.createdById, // Assuming creator is manager for now
        dispatcherId: workOrder.createdById, // Would need proper logic to determine dispatcher
      });

      const rating = await storage.createClientServiceRating(ratingData);
      res.json(rating);
    } catch (error) {
      console.error("Error creating client service rating:", error);
      res.status(500).json({ message: "Failed to create rating" });
    }
  });

  // Service company rating client
  app.post('/api/ratings/service-client', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher', 'field_agent'])) {
        return res.status(403).json({ message: "Access denied. Service company role required." });
      }

      // Get work order details to validate access and populate data
      const workOrder = await storage.getWorkOrder(req.body.workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Check if rating already exists
      const existingRating = await storage.getServiceClientRating(req.body.workOrderId, userId);
      if (existingRating) {
        return res.status(400).json({ message: "Rating already exists for this work order" });
      }

      const ratingData = insertServiceClientRatingSchema.parse({
        ...req.body,
        raterId: userId,
        clientId: workOrder.createdById,
        companyId: workOrder.companyId,
      });

      const rating = await storage.createServiceClientRating(ratingData);
      res.json(rating);
    } catch (error) {
      console.error("Error creating service client rating:", error);
      res.status(500).json({ message: "Failed to create rating" });
    }
  });

  // Get service company ratings
  app.get('/api/ratings/service-company/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Administrator or manager role required." });
      }

      const ratings = await storage.getServiceCompanyRatings(req.params.companyId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching service company ratings:", error);
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });

  // Get client ratings
  app.get('/api/ratings/client/:clientId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (!isClient(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager']))) {
        return res.status(403).json({ message: "Access denied." });
      }

      // Clients can only view their own ratings
      if (isClient(currentUser) && req.params.clientId !== userId) {
        return res.status(403).json({ message: "Access denied. Can only view own ratings." });
      }

      const ratings = await storage.getClientRatings(req.params.clientId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching client ratings:", error);
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });

  // ===== CLIENT MANAGEMENT & JOB NETWORK ROUTES =====

  // Client work orders route
  app.get('/api/client/work-orders', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      const isClientRole = currentUser?.roles.includes('client');
      const isOperationsDirectorTesting = isOperationsDirector(currentUser || null) && req.headers['x-testing-role'] === 'client';
      
      if (!currentUser || (!isClientRole && !isOperationsDirectorTesting)) {
        return res.status(403).json({ message: "Access denied. Client role required." });
      }

      const workOrders = await storage.getClientWorkOrders(currentUser.id);
      res.json(workOrders);
    } catch (error) {
      console.error("Error fetching client work orders:", error);
      res.status(500).json({ message: "Failed to fetch work orders" });
    }
  });

  // Client assignment requests route
  app.get('/api/client/assignment-requests', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      const isClientRole = currentUser?.roles.includes('client');
      const isOperationsDirectorTesting = isOperationsDirector(currentUser || null) && req.headers['x-testing-role'] === 'client';
      
      if (!currentUser || (!isClientRole && !isOperationsDirectorTesting)) {
        return res.status(403).json({ message: "Access denied. Client role required." });
      }

      const requests = await storage.getClientAssignmentRequests(currentUser.id);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching client assignment requests:", error);
      res.status(500).json({ message: "Failed to fetch assignment requests" });
    }
  });

  // Client respond to assignment request
  app.post('/api/client/respond-request', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !currentUser.roles.includes('client')) {
        return res.status(403).json({ message: "Access denied. Client role required." });
      }

      const { requestId, action, notes } = req.body;
      if (!['accept', 'decline'].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Must be 'accept' or 'decline'" });
      }

      const result = await storage.respondToAssignmentRequest(requestId, action, notes, currentUser.id);
      res.json(result);
    } catch (error) {
      console.error("Error responding to assignment request:", error);
      res.status(500).json({ message: "Failed to respond to request" });
    }
  });

  // Job network work orders (client-created orders for management assignment)
  app.get('/api/job-network/work-orders', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher', 'client'])) {
        return res.status(403).json({ message: "Access denied. Management or client role required." });
      }

      const workOrders = await storage.getJobNetworkWorkOrders();
      res.json(workOrders);
    } catch (error) {
      console.error("Error fetching job network work orders:", error);
      res.status(500).json({ message: "Failed to fetch job network work orders" });
    }
  });

  // Request assignment of work order to field agent
  app.post('/api/job-network/request-assignment', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher', 'client'])) {
        return res.status(403).json({ message: "Access denied. Management or client role required." });
      }

      const { workOrderId, agentId, notes } = req.body;
      if (!workOrderId || !agentId) {
        return res.status(400).json({ message: "Work order ID and agent ID are required" });
      }

      const result = await storage.requestWorkOrderAssignment(workOrderId, agentId, currentUser.id, notes);
      res.json(result);
    } catch (error) {
      console.error("Error requesting work order assignment:", error);
      res.status(500).json({ message: "Failed to request assignment" });
    }
  });

  // Direct work order assignment endpoint - for immediate assignment
  app.patch('/api/work-orders/:workOrderId/assign', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher', 'client'])) {
        return res.status(403).json({ message: "Access denied. Management or client role required." });
      }

      const { workOrderId } = req.params;
      const { assigneeId } = req.body;

      if (!assigneeId) {
        return res.status(400).json({ message: "Assignee ID is required" });
      }

      // Update the work order with the direct assignment
      const result = await storage.assignWorkOrderAgent(workOrderId, assigneeId);
      res.json(result);
    } catch (error) {
      console.error("Error assigning work order:", error);
      res.status(500).json({ message: "Failed to assign work order" });
    }
  });

  // Get field agents for assignment selection
  app.get('/api/users/field-agents', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher', 'client'])) {
        return res.status(403).json({ message: "Access denied. Management or client role required." });
      }

      const fieldAgents = await storage.getFieldAgents();
      res.json(fieldAgents);
    } catch (error) {
      console.error("Error fetching field agents:", error);
      res.status(500).json({ message: "Failed to fetch field agents" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
