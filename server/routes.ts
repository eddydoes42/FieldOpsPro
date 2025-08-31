import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAuthenticatedWithODBypass } from "./replitAuth";
import { roleImpersonationService } from "./roleImpersonation";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertUserSchema, insertCompanySchema, insertWorkOrderSchema, insertTimeEntrySchema, insertMessageSchema, insertJobMessageSchema, insertWorkOrderTaskSchema, insertStructuredIssueSchema, insertAuditLogSchema, insertClientFieldAgentRatingSchema, insertClientDispatcherRatingSchema, insertServiceClientRatingSchema, insertIssueSchema, insertWorkOrderRequestSchema, insertExclusiveNetworkMemberSchema, insertProjectSchema, insertProjectRequirementSchema, insertProjectAssignmentSchema, insertApprovalRequestSchema, insertAccessRequestSchema, insertJobRequestSchema, insertOnboardingRequestSchema, insertFeedbackSchema, insertDocumentSchema, isAdmin, hasAnyRole, hasRole, canManageUsers, canManageWorkOrders, canViewBudgets, canViewAllOrders, isOperationsDirector, isClient, isChiefTeam, canCreateProjects, canViewProjectNetwork, isFieldAgent, isFieldLevel, isDispatcher, isService, canViewJobNetwork } from "@shared/schema";
import { logWorkOrderAction, logIssueAction, logUserAction, logAssignmentAction, AUDIT_ACTIONS } from "./auditLogger";
import { z } from "zod";
import bcrypt from "bcrypt";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Helper function to get testing role info from request headers
  function getTestingRoleInfo(req: any) {
    return {
      testingRole: req.headers['x-testing-role'] as string | undefined,
      testingCompanyType: req.headers['x-testing-company-type'] as string | undefined
    };
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      // Check if user is testing a role (for Operations Directors)
      const testingRole = req.headers['x-testing-role'];
      const testingCompanyType = req.headers['x-testing-company-type'];
      
      console.log('Auth user request - testing role:', testingRole, 'company type:', testingCompanyType);
      
      if (user && isOperationsDirector(user) && testingRole) {
        // Switch to test user based on role and company type
        let testUserEmail = '';
        
        if (testingRole === 'project_manager') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testprojectmanager@testclient.com'
            : 'testprojectmanager@testcompany.com';
        } else if (testingRole === 'administrator') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testadmin@testclient.com'
            : 'testadmin@testcompany.com';
        } else if (testingRole === 'manager') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testmanager@testclient.com'
            : 'testmanager@testcompany.com';
        } else if (testingRole === 'dispatcher') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testdispatcher@testclient.com'
            : 'testdispatcher@testcompany.com';
        } else if (testingRole === 'field_engineer') {
          testUserEmail = 'testfieldengineer@testcompany.com';
        } else if (testingRole === 'field_agent') {
          testUserEmail = 'testfieldagent@testcompany.com';
        }
        
        if (testUserEmail) {
          const testUser = await storage.getUserByEmail(testUserEmail);
          if (testUser) {
            user = testUser;
          }
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Role Impersonation routes
  app.post('/api/impersonation/start', isAuthenticated, async (req: any, res) => {
    try {
      const originalUserId = req.user.claims.sub;
      const { role, companyType } = req.body;

      // Validate request
      if (!role || !companyType) {
        return res.status(400).json({ message: "Role and companyType are required" });
      }

      if (!['service', 'client'].includes(companyType)) {
        return res.status(400).json({ message: "Invalid companyType. Must be 'service' or 'client'" });
      }

      // Start impersonation
      const impersonationContext = await roleImpersonationService.startImpersonation(
        originalUserId, 
        role, 
        companyType
      );

      res.json({
        success: true,
        context: {
          impersonatedUser: impersonationContext.impersonatedUser,
          role: impersonationContext.role,
          companyType: impersonationContext.companyType
        }
      });
    } catch (error) {
      console.error("Error starting impersonation:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to start impersonation" });
    }
  });

  app.post('/api/impersonation/stop', isAuthenticated, async (req: any, res) => {
    try {
      const originalUserId = req.user.claims.sub;
      await roleImpersonationService.stopImpersonation(originalUserId);

      res.json({ success: true, message: "Impersonation stopped" });
    } catch (error) {
      console.error("Error stopping impersonation:", error);
      res.status(500).json({ message: "Failed to stop impersonation" });
    }
  });

  app.get('/api/impersonation/status', isAuthenticated, async (req: any, res) => {
    try {
      const originalUserId = req.user.claims.sub;
      const impersonationContext = roleImpersonationService.getImpersonationContext(originalUserId);

      res.json({
        isImpersonating: !!impersonationContext,
        context: impersonationContext ? {
          impersonatedUser: impersonationContext.impersonatedUser,
          role: impersonationContext.role,
          companyType: impersonationContext.companyType,
          startTime: impersonationContext.startTime
        } : null
      });
    } catch (error) {
      console.error("Error getting impersonation status:", error);
      res.status(500).json({ message: "Failed to get impersonation status" });
    }
  });

  // Dashboard statistics route
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isAdmin(currentUser)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Pass companyId for company-specific stats (Operations Directors see all, Admins see their company only)
      const companyId = isOperationsDirector(currentUser) ? undefined : (currentUser.companyId || undefined);
      const stats = await storage.getDashboardStats(companyId);
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
      if (!currentUser || (!isAdmin(currentUser) && !isOperationsDirector(currentUser))) {
        return res.status(403).json({ message: "Only administrators and Operations Directors can create users and assign roles" });
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
      if (!currentUser || (!isAdmin(currentUser) && !isOperationsDirector(currentUser))) {
        return res.status(403).json({ message: "Only administrators and Operations Directors can onboard users and assign roles" });
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
        // Hash password with bcrypt
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

      // Special protection for TestAdmin Service user
      if (userToDelete.email === 'testadmin.service@test.com') {
        return res.status(403).json({ message: "TestAdmin Service user is protected and cannot be deleted" });
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
  app.get('/api/users/field-agents', isAuthenticatedWithODBypass, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Allow access to clients, service company roles, and Operations Director
      const hasAccess = hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher', 'client']) || 
                       isClient(currentUser) || isOperationsDirector(currentUser);
      
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
      
      // Log audit trail for work order confirmation
      await logWorkOrderAction(
        id,
        AUDIT_ACTIONS.UPDATED,
        currentUser.id,
        { status: workOrder.status },
        { status: 'confirmed' },
        'Work order confirmed by assigned agent'
      );
      
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
      
      // Log audit trail for work order status update
      await logWorkOrderAction(
        id,
        AUDIT_ACTIONS.UPDATED,
        currentUser.id,
        { workStatus: workOrder.workStatus },
        { workStatus: workStatus },
        `Work status changed to ${workStatus}`
      );
      
      res.json(updatedWorkOrder);
    } catch (error) {
      console.error("Error updating work order status:", error);
      res.status(500).json({ message: "Failed to update work order status" });
    }
  });

  // Update assignment progress status
  app.patch("/api/work-orders/:id/assignment-progress", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.claims.sub;

      // Get current user and work order
      const currentUser = await storage.getUser(userId);
      const workOrder = await storage.getWorkOrder(id);
      
      if (!currentUser || !workOrder) {
        return res.status(404).json({ message: "User or work order not found" });
      }

      // Check if user is assigned to this work order or has management privileges
      const canUpdate = canManageWorkOrders(currentUser) || workOrder.assigneeId === userId;
      
      if (!canUpdate) {
        return res.status(403).json({ message: "Not authorized to update this work order" });
      }

      const updatedWorkOrder = await storage.updateAssignmentProgressStatus(id, status);
      res.json(updatedWorkOrder);
    } catch (error) {
      console.error("Error updating assignment progress status:", error);
      res.status(500).json({ message: "Failed to update assignment progress status" });
    }
  });

  // Schedule work order
  app.patch("/api/work-orders/:id/schedule", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Get current user and work order
      const currentUser = await storage.getUser(userId);
      const workOrder = await storage.getWorkOrder(id);
      
      if (!currentUser || !workOrder) {
        return res.status(404).json({ message: "User or work order not found" });
      }

      // Only assigned field agents and management can schedule work orders
      const canSchedule = (hasAnyRole(currentUser, ['field_agent']) && workOrder.assigneeId === userId) ||
                         canManageWorkOrders(currentUser);
      
      if (!canSchedule) {
        return res.status(403).json({ message: "Only assigned field agents or management can schedule work orders" });
      }

      const updatedWorkOrder = await storage.scheduleWorkOrder(id);
      res.json(updatedWorkOrder);
    } catch (error) {
      console.error("Error scheduling work order:", error);
      res.status(500).json({ message: "Failed to schedule work order" });
    }
  });

  // Work Order routes
  app.post('/api/work-orders', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      console.log("Work order creation - User:", currentUser?.email, "Roles:", currentUser?.roles);
      console.log("canManageUsers:", canManageUsers(currentUser || null), "isClient:", isClient(currentUser || null));
      
      // Allow management users, clients, and operations directors to create work orders
      if (!currentUser || (!canManageUsers(currentUser) && !isClient(currentUser) && !isOperationsDirector(currentUser || null))) {
        console.log("Permission denied for work order creation");
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Transform the data to match schema expectations
      // Check if this should be treated as a client-created work order
      // (either user is actual client OR operations director testing client role via UI)
      const isClientUser = isClient(currentUser) || (isOperationsDirector(currentUser) && req.body.isClientCreated);
      
      // Handle Operations Director posting on behalf of companies
      let effectiveCompanyId = null; // Default to null for Operations Directors
      let visibilityScope = 'public'; // Default visibility
      
      if (isOperationsDirector(currentUser) && req.body.clientCompanyId) {
        if (req.body.clientCompanyId === 'operations_director') {
          effectiveCompanyId = null; // Operations Director uses null company (god mode)
          visibilityScope = 'public'; // OD posts are public
        } else {
          effectiveCompanyId = req.body.clientCompanyId; // Use selected company
          
          // Determine visibility based on company type
          const selectedCompany = await storage.getCompany(req.body.clientCompanyId);
          if (selectedCompany?.type === 'service') {
            visibilityScope = 'exclusive'; // Service company posts are internal-only
          } else {
            visibilityScope = 'public'; // Client company posts are public
          }
        }
      } else if (currentUser.companyId) {
        effectiveCompanyId = currentUser.companyId; // Use user's company
        visibilityScope = 'public'; // Default to public for regular users
      }
      
      console.log("Work order creation - effectiveCompanyId:", effectiveCompanyId, "visibilityScope:", visibilityScope);
      
      const workOrderData = {
        id: `wo-${Date.now()}`, // Generate unique ID
        title: req.body.title,
        description: req.body.description,
        companyId: effectiveCompanyId,
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
        visibilityScope: visibilityScope, // Set visibility based on company type
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

      // Check if trying to message operations director
      if (req.body.recipientId) {
        const recipient = await storage.getUser(req.body.recipientId);
        if (recipient && isOperationsDirector(recipient)) {
          // Only chief team members (administrators and managers) can message operations director
          if (!isChiefTeam(currentUser)) {
            return res.status(403).json({ 
              message: "Only administrators and managers can message the Operations Director" 
            });
          }
        }
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

  // Reset today's active time entries (for testing)
  app.patch('/api/time-entries/reset-today', isAuthenticated, async (req: any, res) => {
    try {
      const today = new Date().toDateString();
      const activeEntries = await storage.getAllActiveTimeEntries();
      
      for (const entry of activeEntries) {
        const entryDate = new Date(entry.startTime).toDateString();
        if (entryDate === today) {
          await storage.endTimeEntry(entry.id, new Date());
        }
      }
      
      res.json({ message: 'Today\'s active time entries have been reset' });
    } catch (error) {
      console.error('Error resetting today\'s time entries:', error);
      res.status(500).json({ message: 'Failed to reset today\'s time entries' });
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

  // Hazard Reporting (Issues) Routes
  app.post("/api/work-orders/:workOrderId/create-issue", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { workOrderId } = req.params;
      const workOrder = await storage.getWorkOrder(workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      const issueData = insertIssueSchema.parse({
        ...req.body,
        workOrderId,
        companyId: workOrder.companyId,
        reportedById: currentUser.id,
      });

      const issue = await storage.createIssue(issueData);
      res.status(201).json(issue);
    } catch (error) {
      console.error("Error creating issue:", error);
      res.status(500).json({ message: "Failed to create issue" });
    }
  });

  app.get("/api/issues/open", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Insufficient permissions to view issues" });
      }

      const issues = await storage.getAllOpenIssues();
      res.json(issues);
    } catch (error) {
      console.error("Error fetching open issues:", error);
      res.status(500).json({ message: "Failed to fetch open issues" });
    }
  });

  app.get("/api/work-orders/:workOrderId/issues-hazards", isAuthenticated, async (req: any, res) => {
    try {
      const { workOrderId } = req.params;
      const issues = await storage.getIssuesByWorkOrder(workOrderId);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching work order issues:", error);
      res.status(500).json({ message: "Failed to fetch work order issues" });
    }
  });

  app.patch("/api/issues/:issueId/resolve", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager'])) {
        return res.status(403).json({ message: "Only managers and above can resolve issues" });
      }

      const { issueId } = req.params;
      const { resolution } = req.body;

      if (!resolution) {
        return res.status(400).json({ message: "Resolution text is required" });
      }

      const issue = await storage.resolveIssue(issueId, currentUser.id, resolution);
      res.json(issue);
    } catch (error) {
      console.error("Error resolving issue:", error);
      res.status(500).json({ message: "Failed to resolve issue" });
    }
  });

  app.get("/api/companies/:companyId/issues", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Insufficient permissions to view company issues" });
      }

      const { companyId } = req.params;
      const issues = await storage.getIssuesByCompany(companyId);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching company issues:", error);
      res.status(500).json({ message: "Failed to fetch company issues" });
    }
  });

  // Enhanced Structured Issues API (Module 5)
  app.get("/api/structured-issues", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { workOrderId, status, severity, category, reporterId } = req.query;
      const filters: any = {};
      
      if (workOrderId) filters.workOrderId = workOrderId;
      if (status) filters.status = status;
      if (severity) filters.severity = severity;
      if (category) filters.category = category;
      if (reporterId) filters.reporterId = reporterId;

      // Apply role-based filtering
      if (!hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        // Non-managers can only see issues from their company or that they reported
        filters.companyId = currentUser.companyId;
      }

      const issues = await storage.getStructuredIssues(filters);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching structured issues:", error);
      res.status(500).json({ message: "Failed to fetch structured issues" });
    }
  });

  app.post("/api/structured-issues", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const issueData = {
        ...req.body,
        reportedById: currentUser.id,
        companyId: currentUser.companyId,
      };

      const issue = await storage.createStructuredIssue(issueData);
      
      // Auto-escalate high severity issues
      if (issue.severity === 'high' || issue.severity === 'critical') {
        await storage.createEscalationNotification(issue.id, currentUser.companyId);
      }

      res.status(201).json(issue);
    } catch (error) {
      console.error("Error creating structured issue:", error);
      res.status(500).json({ message: "Failed to create structured issue" });
    }
  });

  app.patch("/api/structured-issues/:issueId", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { issueId } = req.params;
      const updates = req.body;

      // Only managers and above can resolve issues
      if (updates.status === 'resolved' && !hasAnyRole(currentUser, ['administrator', 'manager'])) {
        return res.status(403).json({ message: "Only managers can resolve issues" });
      }

      if (updates.status === 'resolved') {
        updates.resolvedById = currentUser.id;
        updates.resolvedAt = new Date();
      }

      const issue = await storage.updateStructuredIssue(issueId, updates);
      res.json(issue);
    } catch (error) {
      console.error("Error updating structured issue:", error);
      res.status(500).json({ message: "Failed to update structured issue" });
    }
  });

  // Issue Analytics and Reporting
  app.get("/api/structured-issues/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { period = '30', companyId } = req.query;
      const analytics = await storage.getIssueAnalytics({
        period: parseInt(period as string),
        companyId: companyId as string || currentUser.companyId || undefined,
      });

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching issue analytics:", error);
      res.status(500).json({ message: "Failed to fetch issue analytics" });
    }
  });

  // Client Feedback System API (Module 6)
  app.get("/api/ratings/existing/:workOrderId", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { workOrderId } = req.params;
      const existingRatings = await storage.getExistingRatings(workOrderId, currentUser.id);
      res.json(existingRatings);
    } catch (error) {
      console.error("Error fetching existing ratings:", error);
      res.status(500).json({ message: "Failed to fetch existing ratings" });
    }
  });

  app.get("/api/feedback/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { timeFrame = '30', category = 'all', companyId, agentId } = req.query;
      
      // Access control
      if (agentId && !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager', 'field_agent'])) {
        return res.status(403).json({ message: "Insufficient permissions to view agent analytics" });
      }

      if (hasAnyRole(currentUser, ['field_agent']) && agentId !== currentUser.id) {
        return res.status(403).json({ message: "Field agents can only view their own analytics" });
      }

      const analytics = await storage.getFeedbackAnalytics({
        timeFrame: parseInt(timeFrame as string),
        category: category as string,
        companyId: companyId as string || currentUser.companyId,
        agentId: agentId as string,
      });

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching feedback analytics:", error);
      res.status(500).json({ message: "Failed to fetch feedback analytics" });
    }
  });

  app.get("/api/feedback/trends", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { timeFrame = '30', companyId, agentId } = req.query;
      
      const trends = await storage.getFeedbackTrends({
        timeFrame: parseInt(timeFrame as string),
        companyId: companyId as string || currentUser.companyId,
        agentId: agentId as string,
      });

      res.json(trends);
    } catch (error) {
      console.error("Error fetching feedback trends:", error);
      res.status(500).json({ message: "Failed to fetch feedback trends" });
    }
  });

  // Bulk feedback operations
  app.post("/api/feedback/bulk-request", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager'])) {
        return res.status(403).json({ message: "Only managers can send bulk feedback requests" });
      }

      const { workOrderIds, reminderType = 'gentle' } = req.body;
      const results = await storage.sendBulkFeedbackRequests(workOrderIds, reminderType, currentUser.id);
      
      res.json({
        message: `Feedback requests sent for ${results.sent} work orders`,
        details: results
      });
    } catch (error) {
      console.error("Error sending bulk feedback requests:", error);
      res.status(500).json({ message: "Failed to send bulk feedback requests" });
    }
  });

  // M1 - Job Request System API
  app.get("/api/job-requests", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { companyId, viewMode, search, status, priority, category } = req.query;
      
      const jobRequests = await storage.getJobRequests({
        companyId: companyId as string || currentUser.companyId,
        viewMode: viewMode as string || 'network',
        search: search as string,
        status: status as string,
        priority: priority as string,
        category: category as string,
        requesterId: currentUser.id,
      });

      res.json(jobRequests);
    } catch (error) {
      console.error("Error fetching job requests:", error);
      res.status(500).json({ message: "Failed to fetch job requests" });
    }
  });

  app.post("/api/job-requests", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Insufficient permissions to create job requests" });
      }

      const jobRequest = await storage.createJobRequest({
        ...req.body,
        clientCompanyId: currentUser.companyId,
        postedById: currentUser.id,
      });

      res.json(jobRequest);
    } catch (error) {
      console.error("Error creating job request:", error);
      res.status(500).json({ message: "Failed to create job request" });
    }
  });

  app.post("/api/job-requests/:id/assign", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Insufficient permissions to assign job requests" });
      }

      const { id } = req.params;
      const { serviceCompanyId } = req.body;

      const assignedRequest = await storage.assignJobRequest(id, serviceCompanyId, currentUser.id);
      
      res.json(assignedRequest);
    } catch (error) {
      console.error("Error assigning job request:", error);
      res.status(500).json({ message: "Failed to assign job request" });
    }
  });

  // M2 - Contractor Onboarding Flow API
  app.get("/api/contractor-onboarding", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { companyId, userId, viewMode } = req.query;
      
      const onboardingRecords = await storage.getContractorOnboarding({
        companyId: companyId as string || currentUser.companyId,
        userId: userId as string,
        viewMode: viewMode as string || 'overview',
        requesterId: currentUser.id,
      });

      res.json(onboardingRecords);
    } catch (error) {
      console.error("Error fetching contractor onboarding:", error);
      res.status(500).json({ message: "Failed to fetch contractor onboarding" });
    }
  });

  app.get("/api/contractor-onboarding/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { id } = req.params;
      const onboardingDetails = await storage.getContractorOnboardingDetails(id, currentUser.id);
      
      res.json(onboardingDetails);
    } catch (error) {
      console.error("Error fetching onboarding details:", error);
      res.status(500).json({ message: "Failed to fetch onboarding details" });
    }
  });

  app.post("/api/contractor-onboarding/application", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const onboardingRecord = await storage.createContractorOnboarding({
        ...req.body,
        userId: currentUser.id,
        companyId: req.body.companyId || currentUser.companyId,
      });

      res.json(onboardingRecord);
    } catch (error) {
      console.error("Error creating contractor onboarding:", error);
      res.status(500).json({ message: "Failed to create contractor onboarding" });
    }
  });

  app.put("/api/contractor-onboarding/:id/stage", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Insufficient permissions to update onboarding stage" });
      }

      const { id } = req.params;
      const { stage, data } = req.body;

      const updatedRecord = await storage.updateOnboardingStage(id, stage, data, currentUser.id);
      
      res.json(updatedRecord);
    } catch (error) {
      console.error("Error updating onboarding stage:", error);
      res.status(500).json({ message: "Failed to update onboarding stage" });
    }
  });

  app.post("/api/contractor-onboarding/:id/:action", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Insufficient permissions to approve/reject onboarding" });
      }

      const { id, action } = req.params;
      const { notes } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      const result = await storage.processOnboardingApproval(id, action as 'approve' | 'reject', notes, currentUser.id);
      
      res.json(result);
    } catch (error) {
      console.error("Error processing onboarding approval:", error);
      res.status(500).json({ message: "Failed to process onboarding approval" });
    }
  });

  // M4 - Role-Aware Messaging Hub API
  app.get("/api/messaging/channels", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { companyId, workOrderId, projectId, viewMode } = req.query;
      
      const channels = await storage.getMessagingChannels({
        companyId: companyId as string || currentUser.companyId,
        workOrderId: workOrderId as string,
        projectId: projectId as string,
        viewMode: viewMode as string || 'workspace',
        userRole: currentUser.roles?.[0] || 'field_agent',
        userId: currentUser.id,
      });

      res.json(channels);
    } catch (error) {
      console.error("Error fetching messaging channels:", error);
      res.status(500).json({ message: "Failed to fetch messaging channels" });
    }
  });

  app.post("/api/messaging/channels", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Insufficient permissions to create channels" });
      }

      const channel = await storage.createMessagingChannel({
        ...req.body,
        createdById: currentUser.id,
      });

      res.json(channel);
    } catch (error) {
      console.error("Error creating messaging channel:", error);
      res.status(500).json({ message: "Failed to create messaging channel" });
    }
  });

  app.get("/api/messaging/channels/:channelId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { channelId } = req.params;
      const messages = await storage.getChannelMessages(channelId, currentUser.id);

      res.json(messages);
    } catch (error) {
      console.error("Error fetching channel messages:", error);
      res.status(500).json({ message: "Failed to fetch channel messages" });
    }
  });

  app.post("/api/messaging/channels/:channelId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { channelId } = req.params;
      
      // Check if user has access to the channel
      const hasAccess = await storage.checkChannelAccess(channelId, currentUser.id, currentUser.roles?.[0] || 'field_agent');
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this channel" });
      }

      const message = await storage.createChannelMessage({
        ...req.body,
        channelId,
        senderId: currentUser.id,
      });

      res.json(message);
    } catch (error) {
      console.error("Error creating channel message:", error);
      res.status(500).json({ message: "Failed to create channel message" });
    }
  });

  app.put("/api/messaging/channels/:channelId/archive", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Insufficient permissions to archive channels" });
      }

      const { channelId } = req.params;
      const archivedChannel = await storage.archiveMessagingChannel(channelId, currentUser.id);

      res.json(archivedChannel);
    } catch (error) {
      console.error("Error archiving messaging channel:", error);
      res.status(500).json({ message: "Failed to archive messaging channel" });
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

  // Structured Issues API
  app.post('/api/structured-issues', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate the request data
      const validatedData = insertStructuredIssueSchema.parse({
        ...req.body,
        reporterId: currentUser.id,
      });

      const issue = await storage.createStructuredIssue(validatedData);
      
      // Log audit trail for issue creation
      await logIssueAction(
        issue.id,
        AUDIT_ACTIONS.CREATED,
        currentUser.id,
        undefined,
        {
          workOrderId: issue.workOrderId,
          category: issue.type,
          severity: issue.severity,
          title: issue.type,
          status: issue.status
        },
        `New issue created: ${issue.type}`
      );
      
      // If high severity, notify managers/administrators
      if (validatedData.severity === 'high') {
        // Create notifications for managers+ in the same company
        const managers = await storage.getUsersByRole('manager');
        const administrators = await storage.getUsersByRole('administrator');
        const adminUsers = [...managers, ...administrators];
        for (const adminUser of adminUsers) {
          await storage.createNotification({
            userId: adminUser.id,
            workOrderId: validatedData.workOrderId,
            type: 'high_severity_issue',
            title: `High Severity Issue: ${validatedData.type}`,
            message: `New high severity issue reported by ${currentUser.firstName} ${currentUser.lastName}: ${validatedData.description.substring(0, 100)}...`,
            isRead: false,
          });
        }
      }

      res.status(201).json(issue);
    } catch (error) {
      console.error("Error creating structured issue:", error);
      res.status(500).json({ message: "Failed to create structured issue" });
    }
  });

  app.get('/api/structured-issues', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { workOrderId } = req.query;
      
      // Field agents can only see their own issues, managers+ can see all
      let issues;
      if (isFieldAgent(currentUser) && !canManageUsers(currentUser)) {
        // Field agents see only their reported issues
        const allIssues = await storage.getStructuredIssues(workOrderId as string);
        issues = allIssues.filter(issue => issue.reporterId === currentUser.id);
      } else {
        // Managers+ see all issues, optionally filtered by work order
        issues = await storage.getStructuredIssues(workOrderId as string);
      }

      res.json(issues);
    } catch (error) {
      console.error("Error fetching structured issues:", error);
      res.status(500).json({ message: "Failed to fetch structured issues" });
    }
  });

  app.patch('/api/structured-issues/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !canManageUsers(currentUser)) {
        return res.status(403).json({ message: "Only managers and administrators can update issues" });
      }

      const { id } = req.params;
      const updates = { 
        ...req.body,
        reviewedById: currentUser.id,
        reviewedAt: new Date(),
      };

      const issue = await storage.updateStructuredIssue(id, updates);
      res.json(issue);
    } catch (error) {
      console.error("Error updating structured issue:", error);
      res.status(500).json({ message: "Failed to update structured issue" });
    }
  });

  app.get('/api/structured-issues/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const issue = await storage.getStructuredIssueById(id);
      
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      // Check permissions: field agents can only see their own issues
      if (isFieldAgent(currentUser) && !canManageUsers(currentUser) && issue.reporterId !== currentUser.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(issue);
    } catch (error) {
      console.error("Error fetching structured issue:", error);
      res.status(500).json({ message: "Failed to fetch structured issue" });
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

  // Project Manager stats route
  app.get('/api/project-manager/stats', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['project_manager', 'operations_director'])) {
        return res.status(403).json({ message: "Project Manager access required" });
      }

      // Get project statistics for project managers
      const stats = {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalBudget: 0
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching project manager stats:", error);
      res.status(500).json({ message: "Failed to fetch project manager stats" });
    }
  });

  // Company routes - restricted to operations directors
  app.get('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      // Get the original user for Operations Director permission check
      const originalUser = await storage.getUser(req.user.claims.sub);
      if (!originalUser || !isOperationsDirector(originalUser)) {
        return res.status(403).json({ message: "Operations Director access required" });
      }

      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // Get client companies for Operations Director
  app.get('/api/companies/client', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ message: "Operations Director access required" });
      }

      const companies = await storage.getAllCompanies();
      const clientCompanies = companies.filter(company => company.type === 'client');
      res.json(clientCompanies);
    } catch (error) {
      console.error("Error fetching client companies:", error);
      res.status(500).json({ message: "Failed to fetch client companies" });
    }
  });

  // Get service companies for Operations Director
  app.get('/api/companies/service', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ message: "Operations Director access required" });
      }

      const companies = await storage.getAllCompanies();
      const serviceCompanies = companies.filter(company => company.type === 'service');
      res.json(serviceCompanies);
    } catch (error) {
      console.error("Error fetching service companies:", error);
      res.status(500).json({ message: "Failed to fetch service companies" });
    }
  });

  app.post('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      // Get the original user for Operations Director permission check
      const originalUser = await storage.getUser(req.user.claims.sub);
      if (!originalUser || !isOperationsDirector(originalUser)) {
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
      // Get the original user for Operations Director permission check
      const originalUser = await storage.getUser(req.user.claims.sub);
      if (!originalUser || !isOperationsDirector(originalUser)) {
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
      // Get the original user for Operations Director permission check
      const originalUser = await storage.getUser(req.user.claims.sub);
      if (!originalUser || !isOperationsDirector(originalUser)) {
        return res.status(403).json({ message: "Operations Director access required" });
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

  // Client rating field agent
  app.post('/api/ratings/client-field-agent', isAuthenticated, async (req: any, res) => {
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
      const existingRating = await storage.getClientFieldAgentRating(req.body.workOrderId, userId);
      if (existingRating) {
        return res.status(400).json({ message: "Rating already exists for this work order" });
      }

      const ratingData = insertClientFieldAgentRatingSchema.parse({
        ...req.body,
        clientId: userId,
        companyId: workOrder.companyId,
        fieldAgentId: workOrder.assigneeId,
      });

      const rating = await storage.createClientFieldAgentRating(ratingData);
      res.json(rating);
    } catch (error) {
      console.error("Error creating client field agent rating:", error);
      res.status(500).json({ message: "Failed to create rating" });
    }
  });

  // Client rating dispatcher  
  app.post('/api/ratings/client-dispatcher', isAuthenticated, async (req: any, res) => {
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
      const existingRating = await storage.getClientDispatcherRating(req.body.workOrderId, userId);
      if (existingRating) {
        return res.status(400).json({ message: "Rating already exists for this work order" });
      }

      const ratingData = insertClientDispatcherRatingSchema.parse({
        ...req.body,
        clientId: userId,
        companyId: workOrder.companyId,
        dispatcherId: workOrder.createdById, // Assuming creator is dispatcher for now
      });

      const rating = await storage.createClientDispatcherRating(ratingData);
      res.json(rating);
    } catch (error) {
      console.error("Error creating client dispatcher rating:", error);
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

  // Get field agent ratings
  app.get('/api/ratings/field-agent/:fieldAgentId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager', 'field_agent'])) {
        return res.status(403).json({ message: "Access denied." });
      }

      // Field agents can only view their own ratings
      if (hasAnyRole(currentUser, ['field_agent']) && req.params.fieldAgentId !== userId) {
        return res.status(403).json({ message: "Access denied. Can only view own ratings." });
      }

      const ratings = await storage.getFieldAgentRatings(req.params.fieldAgentId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching field agent ratings:", error);
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });

  // Get dispatcher ratings
  app.get('/api/ratings/dispatcher/:dispatcherId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher'])) {
        return res.status(403).json({ message: "Access denied." });
      }

      // Dispatchers can only view their own ratings  
      if (hasAnyRole(currentUser, ['dispatcher']) && req.params.dispatcherId !== userId) {
        return res.status(403).json({ message: "Access denied. Can only view own ratings." });
      }

      const ratings = await storage.getDispatcherRatings(req.params.dispatcherId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching dispatcher ratings:", error);
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

  // FEEDBACK ROUTES (Client Feedback Loop)
  
  // Create feedback for completed work order
  app.post('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !isClient(currentUser)) {
        return res.status(403).json({ message: "Access denied. Only client companies can submit feedback." });
      }

      // Validate input data
      const validatedData = insertFeedbackSchema.parse(req.body);
      
      // Verify work order exists and is completed
      const workOrder = await storage.getWorkOrder(validatedData.workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found." });
      }
      
      if (workOrder.status !== 'completed') {
        return res.status(400).json({ message: "Can only provide feedback for completed work orders." });
      }

      // Check if feedback already exists for this work order
      const existingFeedback = await storage.getFeedbackByWorkOrder(validatedData.workOrderId);
      if (existingFeedback) {
        return res.status(400).json({ message: "Feedback already submitted for this work order." });
      }

      // Create feedback with client as giver
      const feedbackData = {
        ...validatedData,
        givenBy: userId
      };

      const feedback = await storage.createFeedback(feedbackData);
      res.status(201).json(feedback);
    } catch (error: any) {
      console.error("Error creating feedback:", error);
      if (error?.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid feedback data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create feedback" });
    }
  });

  // Get feedback for a work order
  app.get('/api/feedback/work-order/:workOrderId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager', 'operations_director', 'client'])) {
        return res.status(403).json({ message: "Access denied." });
      }

      const feedback = await storage.getFeedbackByWorkOrder(req.params.workOrderId);
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching work order feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // Get feedback for an agent
  app.get('/api/feedback/agent/:agentId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager', 'operations_director', 'field_agent'])) {
        return res.status(403).json({ message: "Access denied." });
      }

      // Field agents can only view their own feedback
      if (hasAnyRole(currentUser, ['field_agent']) && req.params.agentId !== userId) {
        return res.status(403).json({ message: "Access denied. Can only view own feedback." });
      }

      const feedback = await storage.getFeedbackByAgent(req.params.agentId);
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching agent feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // Get all feedback with filters (for Operations Director and admin analytics)
  app.get('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager']))) {
        return res.status(403).json({ message: "Access denied. Only Operations Director and admin teams can view all feedback." });
      }

      // Parse query parameters
      const {
        companyId,
        stars,
        dateFrom,
        dateTo,
        agentId,
        limit = 20,
        offset = 0
      } = req.query;

      // For non-Operations Director users, filter by their company
      const filters = {
        companyId: isOperationsDirector(currentUser) ? companyId : currentUser.companyId,
        stars: stars ? parseInt(stars as string) : undefined,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        agentId: agentId as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const feedback = await storage.getAllFeedback(filters);
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching all feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // PERFORMANCE ANALYTICS ROUTES
  
  // Get performance metrics for an agent
  app.get('/api/performance-metrics/:agentId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { agentId } = req.params;
      const { dateFrom, dateTo } = req.query;
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager', 'field_agent', 'client'])) {
        return res.status(403).json({ message: "Access denied." });
      }

      // Field agents can only view their own metrics
      if (hasAnyRole(currentUser, ['field_agent']) && agentId !== userId) {
        return res.status(403).json({ message: "Access denied. Can only view own performance metrics." });
      }

      // Client companies can only view agents who worked on their work orders
      if (isClient(currentUser)) {
        const clientWorkOrders = await storage.getWorkOrdersByCreator(currentUser.id);
        const hasWorkedForClient = clientWorkOrders.some((wo: any) => wo.assignedAgent === agentId);
        
        if (!hasWorkedForClient) {
          return res.status(403).json({ message: "Access denied. Agent has not worked on your projects." });
        }
      }

      // Service company admins can only view their own company's agents
      if (hasAnyRole(currentUser, ['administrator', 'manager']) && !isOperationsDirector(currentUser)) {
        const agent = await storage.getUser(agentId);
        if (!agent || agent.companyId !== currentUser.companyId) {
          return res.status(403).json({ message: "Access denied. Can only view your company's agents." });
        }
      }

      const metrics = await storage.calculateAgentPerformanceMetrics(agentId, dateFrom, dateTo);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  // Get performance snapshots for an agent
  app.get('/api/performance-snapshots/:agentId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { agentId } = req.params;
      const { limit = 10 } = req.query;
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager', 'field_agent'])) {
        return res.status(403).json({ message: "Access denied." });
      }

      // Field agents can only view their own snapshots
      if (hasAnyRole(currentUser, ['field_agent']) && agentId !== userId) {
        return res.status(403).json({ message: "Access denied. Can only view own performance snapshots." });
      }

      // Service company admins can only view their own company's agents
      if (hasAnyRole(currentUser, ['administrator', 'manager']) && !isOperationsDirector(currentUser)) {
        const agent = await storage.getUser(agentId);
        if (!agent || agent.companyId !== currentUser.companyId) {
          return res.status(403).json({ message: "Access denied. Can only view your company's agents." });
        }
      }

      const snapshots = await storage.getPerformanceSnapshots(agentId, parseInt(limit as string));
      res.json(snapshots);
    } catch (error) {
      console.error("Error fetching performance snapshots:", error);
      res.status(500).json({ message: "Failed to fetch performance snapshots" });
    }
  });

  // Create a performance snapshot (for scheduled tasks or manual triggers)
  app.post('/api/performance-snapshots', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager']))) {
        return res.status(403).json({ message: "Access denied. Only Operations Director and admin teams can create performance snapshots." });
      }

      const { agentId, periodStart, periodEnd } = req.body;

      if (!agentId || !periodStart || !periodEnd) {
        return res.status(400).json({ message: "Agent ID, period start, and period end are required." });
      }

      // Calculate metrics for the specified period
      const metrics = await storage.calculateAgentPerformanceMetrics(agentId, periodStart, periodEnd);

      // Create snapshot
      const snapshotData = {
        agentId,
        periodStart: periodStart,
        periodEnd: periodEnd,
        metrics: metrics
      };

      const snapshot = await storage.createPerformanceSnapshot(snapshotData);
      res.status(201).json(snapshot);
    } catch (error: any) {
      console.error("Error creating performance snapshot:", error);
      if (error?.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid snapshot data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create performance snapshot" });
    }
  });

  // ===== SERVICE QUALITY DASHBOARD ROUTES =====
  
  // Get service quality metrics for a company
  app.get('/api/service-quality/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { companyId } = req.params;
      const { dateFrom, dateTo } = req.query;
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager', 'client'])) {
        return res.status(403).json({ message: "Access denied." });
      }

      // Service company admins can only view their own company's data
      if (hasAnyRole(currentUser, ['administrator', 'manager']) && !isOperationsDirector(currentUser)) {
        if (companyId !== currentUser.companyId) {
          return res.status(403).json({ message: "Access denied. Can only view your company's service quality data." });
        }
      }

      // Client companies can only view service companies they have worked with
      if (isClient(currentUser)) {
        const clientWorkOrders = await storage.getWorkOrdersByCreator(currentUser.id);
        const hasWorkedWithCompany = clientWorkOrders.some((wo: any) => wo.companyId === companyId);
        
        if (!hasWorkedWithCompany) {
          return res.status(403).json({ message: "Access denied. No work history with this service company." });
        }
      }

      const metrics = await storage.calculateServiceQualityMetrics(companyId, dateFrom, dateTo);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching service quality metrics:", error);
      res.status(500).json({ message: "Failed to fetch service quality metrics" });
    }
  });

  // Get service quality snapshots for a company
  app.get('/api/service-quality-snapshots/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { companyId } = req.params;
      const { limit = 10 } = req.query;
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied." });
      }

      // Service company admins can only view their own company's snapshots
      if (hasAnyRole(currentUser, ['administrator', 'manager']) && !isOperationsDirector(currentUser)) {
        if (companyId !== currentUser.companyId) {
          return res.status(403).json({ message: "Access denied. Can only view your company's service quality snapshots." });
        }
      }

      const snapshots = await storage.getServiceQualitySnapshots(companyId, parseInt(limit as string));
      res.json(snapshots);
    } catch (error) {
      console.error("Error fetching service quality snapshots:", error);
      res.status(500).json({ message: "Failed to fetch service quality snapshots" });
    }
  });

  // Create a service quality snapshot (for scheduled tasks or manual triggers)
  app.post('/api/service-quality-snapshots', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager']))) {
        return res.status(403).json({ message: "Access denied. Only Operations Director and admin teams can create service quality snapshots." });
      }

      const { companyId, periodStart, periodEnd } = req.body;

      if (!companyId || !periodStart || !periodEnd) {
        return res.status(400).json({ message: "Company ID, period start, and period end are required." });
      }

      // Service company admins can only create snapshots for their own company
      if (hasAnyRole(currentUser, ['administrator', 'manager']) && !isOperationsDirector(currentUser)) {
        if (companyId !== currentUser.companyId) {
          return res.status(403).json({ message: "Access denied. Can only create snapshots for your company." });
        }
      }

      // Calculate metrics for the specified period
      const metrics = await storage.calculateServiceQualityMetrics(companyId, periodStart, periodEnd);

      // Create snapshot
      const snapshotData = {
        companyId,
        periodStart: periodStart,
        periodEnd: periodEnd,
        metrics: metrics
      };

      const snapshot = await storage.createServiceQualitySnapshot(snapshotData);
      res.status(201).json(snapshot);
    } catch (error: any) {
      console.error("Error creating service quality snapshot:", error);
      if (error?.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid snapshot data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create service quality snapshot" });
    }
  });

  // ===== PREDICTIVE RISK ANALYSIS ROUTES =====
  
  // Get risk scores for entities (agents or companies)
  app.get('/api/risk-scores', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { entityType, entityId, limit = 50, threshold } = req.query;
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      // Service company admins can only view risks for their own company/agents
      if (hasAnyRole(currentUser, ['administrator', 'manager']) && !isOperationsDirector(currentUser)) {
        if (entityType === 'company' && entityId !== currentUser.companyId) {
          return res.status(403).json({ message: "Access denied. Can only view your company's risk data." });
        }
        if (entityType === 'agent') {
          const agent = await storage.getUser(entityId);
          if (!agent || agent.companyId !== currentUser.companyId) {
            return res.status(403).json({ message: "Access denied. Can only view your company's agents' risk data." });
          }
        }
      }

      let riskScores;
      if (threshold) {
        riskScores = await storage.getHighRiskEntities(parseInt(threshold as string));
      } else {
        riskScores = await storage.getRiskScores(entityType, entityId, parseInt(limit as string));
      }

      res.json(riskScores);
    } catch (error) {
      console.error("Error fetching risk scores:", error);
      res.status(500).json({ message: "Failed to fetch risk scores" });
    }
  });

  // Calculate and create risk score for an entity
  app.post('/api/risk-scores/calculate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager']))) {
        return res.status(403).json({ message: "Access denied. Only Operations Director and admin teams can calculate risk scores." });
      }

      const { entityType, entityId, periodStart, periodEnd } = req.body;

      if (!entityType || !entityId || !periodStart || !periodEnd) {
        return res.status(400).json({ message: "Entity type, entity ID, period start, and period end are required." });
      }

      // Service company admins can only calculate risks for their own company/agents
      if (hasAnyRole(currentUser, ['administrator', 'manager']) && !isOperationsDirector(currentUser)) {
        if (entityType === 'company' && entityId !== currentUser.companyId) {
          return res.status(403).json({ message: "Access denied. Can only calculate risk for your company." });
        }
        if (entityType === 'agent') {
          const agent = await storage.getUser(entityId);
          if (!agent || agent.companyId !== currentUser.companyId) {
            return res.status(403).json({ message: "Access denied. Can only calculate risk for your company's agents." });
          }
        }
      }

      // Calculate risk score and flagged metrics
      const riskAnalysis = await storage.calculateRiskScore(entityType, entityId, periodStart, periodEnd);

      // Create risk score record
      const riskScoreData = {
        entityType,
        entityId,
        score: riskAnalysis.score,
        periodStart: periodStart,
        periodEnd: periodEnd,
        flaggedMetrics: riskAnalysis.flaggedMetrics
      };

      const riskScore = await storage.createRiskScore(riskScoreData);
      res.status(201).json(riskScore);
    } catch (error: any) {
      console.error("Error calculating risk score:", error);
      if (error?.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid risk score data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to calculate risk score" });
    }
  });

  // Get entities at risk above threshold
  app.get('/api/risk-monitor', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { threshold = 70 } = req.query;
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      let entitiesAtRisk;
      if (isOperationsDirector(currentUser)) {
        // Operations Director can see all entities at risk
        entitiesAtRisk = await storage.getEntitiesAtRisk(parseInt(threshold as string));
      } else {
        // Service company admins can only see their company's risks
        const companyRiskScores = await storage.getRiskScores('company', currentUser.companyId!);
        const agentRiskScores = await storage.getRiskScores('agent');
        
        // Filter agent risks to only company agents
        const companyAgents = await storage.getUsersByRole('field_agent');
        const companyAgentIds = companyAgents
          .filter(agent => agent.companyId === currentUser.companyId)
          .map(agent => agent.id);
        
        const filteredAgentRiskScores = agentRiskScores.filter(score => 
          companyAgentIds.includes(score.entityId) && 
          score.score >= parseInt(threshold as string)
        );

        const filteredCompanyRiskScores = companyRiskScores.filter(score => 
          score.score >= parseInt(threshold as string)
        );

        const agents = [];
        const companies = [];
        
        for (const riskScore of filteredAgentRiskScores) {
          const agent = await storage.getUser(riskScore.entityId);
          if (agent) {
            agents.push({ agent, riskScore });
          }
        }
        
        for (const riskScore of filteredCompanyRiskScores) {
          const company = await storage.getCompany(riskScore.entityId);
          if (company) {
            companies.push({ company, riskScore });
          }
        }
        
        entitiesAtRisk = { agents, companies };
      }

      res.json(entitiesAtRisk);
    } catch (error) {
      console.error("Error fetching entities at risk:", error);
      res.status(500).json({ message: "Failed to fetch entities at risk" });
    }
  });

  // Create risk intervention
  app.post('/api/risk-interventions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      const { riskId, action, assignedTo, notes } = req.body;

      if (!riskId || !action) {
        return res.status(400).json({ message: "Risk ID and action are required." });
      }

      // Verify risk score exists and user has access
      const riskScore = await storage.getRiskScores().then(scores => 
        scores.find(score => score.id === riskId)
      );
      
      if (!riskScore) {
        return res.status(404).json({ message: "Risk score not found." });
      }

      // Service company admins can only create interventions for their company's risks
      if (hasAnyRole(currentUser, ['administrator', 'manager']) && !isOperationsDirector(currentUser)) {
        if (riskScore.entityType === 'company' && riskScore.entityId !== currentUser.companyId) {
          return res.status(403).json({ message: "Access denied. Can only create interventions for your company's risks." });
        }
        if (riskScore.entityType === 'agent') {
          const agent = await storage.getUser(riskScore.entityId);
          if (!agent || agent.companyId !== currentUser.companyId) {
            return res.status(403).json({ message: "Access denied. Can only create interventions for your company's agents." });
          }
        }
      }

      const interventionData = {
        riskId,
        action,
        assignedTo: assignedTo || userId,
        notes,
        status: 'open' as const
      };

      const intervention = await storage.createRiskIntervention(interventionData);
      res.status(201).json(intervention);
    } catch (error: any) {
      console.error("Error creating risk intervention:", error);
      if (error?.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid intervention data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create risk intervention" });
    }
  });

  // Get risk interventions
  app.get('/api/risk-interventions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { riskId, assignedTo } = req.query;
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager', 'field_agent'])) {
        return res.status(403).json({ message: "Access denied." });
      }

      let interventions;
      if (isOperationsDirector(currentUser)) {
        // Operations Director can see all interventions
        interventions = await storage.getRiskInterventions(riskId, assignedTo);
      } else if (hasAnyRole(currentUser, ['administrator', 'manager'])) {
        // Admin team can see company interventions
        interventions = await storage.getRiskInterventions(riskId, assignedTo);
        // Filter to only company-related interventions
        const filteredInterventions = [];
        for (const intervention of interventions) {
          const riskScore = await storage.getRiskScores().then(scores => 
            scores.find(score => score.id === intervention.riskId)
          );
          if (riskScore) {
            if (riskScore.entityType === 'company' && riskScore.entityId === currentUser.companyId) {
              filteredInterventions.push(intervention);
            } else if (riskScore.entityType === 'agent') {
              const agent = await storage.getUser(riskScore.entityId);
              if (agent && agent.companyId === currentUser.companyId) {
                filteredInterventions.push(intervention);
              }
            }
          }
        }
        interventions = filteredInterventions;
      } else {
        // Field agents can only see interventions assigned to them
        interventions = await storage.getRiskInterventions(riskId, userId);
      }

      res.json(interventions);
    } catch (error) {
      console.error("Error fetching risk interventions:", error);
      res.status(500).json({ message: "Failed to fetch risk interventions" });
    }
  });

  // Update risk intervention status
  app.put('/api/risk-interventions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { id } = req.params;
      const { status, notes, completedAt } = req.body;
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager', 'field_agent'])) {
        return res.status(403).json({ message: "Access denied." });
      }

      // Get intervention to verify permissions
      const interventions = await storage.getRiskInterventions();
      const intervention = interventions.find(i => i.id === id);
      
      if (!intervention) {
        return res.status(404).json({ message: "Risk intervention not found." });
      }

      // Users can only update interventions assigned to them or if they're admin/operations director
      if (intervention.assignedTo !== userId && 
          !isOperationsDirector(currentUser) && 
          !hasAnyRole(currentUser, ['administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Can only update interventions assigned to you." });
      }

      const updates: any = {};
      if (status) updates.status = status;
      if (notes) updates.notes = notes;
      if (completedAt) updates.completedAt = new Date(completedAt);

      const updatedIntervention = await storage.updateRiskIntervention(id, updates);
      res.json(updatedIntervention);
    } catch (error) {
      console.error("Error updating risk intervention:", error);
      res.status(500).json({ message: "Failed to update risk intervention" });
    }
  });

  // ===== WORK ORDER TOOLS & DOCUMENTS ROUTES =====

  // Get work order tools
  app.get('/api/work-orders/:workOrderId/tools', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { workOrderId } = req.params;

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get the work order to check permissions
      const workOrder = await storage.getWorkOrder(workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Check if user can access this work order
      if (!isOperationsDirector(currentUser) && workOrder.companyId !== currentUser.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const tools = await storage.getWorkOrderTools(workOrderId);
      res.json(tools);
    } catch (error) {
      console.error("Error fetching work order tools:", error);
      res.status(500).json({ message: "Failed to fetch work order tools" });
    }
  });

  // Create work order tool
  app.post('/api/work-orders/:workOrderId/tools', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { workOrderId } = req.params;
      const { name, description, category, isRequired, orderIndex } = req.body;

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager', 'dispatcher'])) {
        return res.status(403).json({ message: "Access denied. Admin team access required." });
      }

      // Get the work order to check permissions
      const workOrder = await storage.getWorkOrder(workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      if (!isOperationsDirector(currentUser) && workOrder.companyId !== currentUser.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const toolData = {
        workOrderId,
        name,
        description,
        category,
        isRequired: isRequired ?? true,
        orderIndex: orderIndex ?? 0
      };

      const tool = await storage.createWorkOrderTool(toolData);
      res.status(201).json(tool);
    } catch (error) {
      console.error("Error creating work order tool:", error);
      res.status(500).json({ message: "Failed to create work order tool" });
    }
  });

  // Update work order tool
  app.put('/api/work-orders/tools/:toolId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { toolId } = req.params;
      const updates = req.body;

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const tool = await storage.updateWorkOrderTool(toolId, updates);
      res.json(tool);
    } catch (error) {
      console.error("Error updating work order tool:", error);
      res.status(500).json({ message: "Failed to update work order tool" });
    }
  });

  // Confirm tool availability
  app.post('/api/work-orders/tools/:toolId/confirm', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { toolId } = req.params;

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const tool = await storage.confirmToolAvailability(toolId, userId);
      res.json(tool);
    } catch (error) {
      console.error("Error confirming tool availability:", error);
      res.status(500).json({ message: "Failed to confirm tool availability" });
    }
  });

  // Delete work order tool
  app.delete('/api/work-orders/tools/:toolId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { toolId } = req.params;

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager', 'dispatcher'])) {
        return res.status(403).json({ message: "Access denied. Admin team access required." });
      }

      await storage.deleteWorkOrderTool(toolId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting work order tool:", error);
      res.status(500).json({ message: "Failed to delete work order tool" });
    }
  });

  // Get work order documents
  app.get('/api/work-orders/:workOrderId/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { workOrderId } = req.params;

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get the work order to check permissions
      const workOrder = await storage.getWorkOrder(workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Check if user can access this work order
      if (!isOperationsDirector(currentUser) && workOrder.companyId !== currentUser.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const documents = await storage.getWorkOrderDocuments(workOrderId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching work order documents:", error);
      res.status(500).json({ message: "Failed to fetch work order documents" });
    }
  });

  // Create work order document
  app.post('/api/work-orders/:workOrderId/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { workOrderId } = req.params;
      const { name, description, category, fileUrl, isRequired, orderIndex } = req.body;

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager', 'dispatcher'])) {
        return res.status(403).json({ message: "Access denied. Admin team access required." });
      }

      // Get the work order to check permissions
      const workOrder = await storage.getWorkOrder(workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      if (!isOperationsDirector(currentUser) && workOrder.companyId !== currentUser.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const documentData = {
        workOrderId,
        name,
        description,
        category,
        fileUrl,
        isRequired: isRequired ?? true,
        orderIndex: orderIndex ?? 0
      };

      const document = await storage.createWorkOrderDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating work order document:", error);
      res.status(500).json({ message: "Failed to create work order document" });
    }
  });

  // Update work order document
  app.put('/api/work-orders/documents/:documentId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { documentId } = req.params;
      const updates = req.body;

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const document = await storage.updateWorkOrderDocument(documentId, updates);
      res.json(document);
    } catch (error) {
      console.error("Error updating work order document:", error);
      res.status(500).json({ message: "Failed to update work order document" });
    }
  });

  // Mark document completed
  app.post('/api/work-orders/documents/:documentId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { documentId } = req.params;

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const document = await storage.markDocumentCompleted(documentId, userId);
      res.json(document);
    } catch (error) {
      console.error("Error marking document completed:", error);
      res.status(500).json({ message: "Failed to mark document completed" });
    }
  });

  // Delete work order document
  app.delete('/api/work-orders/documents/:documentId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { documentId } = req.params;

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager', 'dispatcher'])) {
        return res.status(403).json({ message: "Access denied. Admin team access required." });
      }

      await storage.deleteWorkOrderDocument(documentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting work order document:", error);
      res.status(500).json({ message: "Failed to delete work order document" });
    }
  });

  // ===== CLIENT FEEDBACK LOOP ROUTES =====

  // Create feedback after work order completion
  app.post('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !isClient(currentUser)) {
        return res.status(403).json({ message: "Access denied. Client role required." });
      }

      // Get work order details to validate access and populate data
      const workOrder = await storage.getWorkOrder(req.body.workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Check if work order is completed
      if (workOrder.status !== 'completed') {
        return res.status(400).json({ message: "Feedback can only be submitted for completed work orders" });
      }

      // Check if client created this work order
      if (workOrder.createdById !== userId) {
        return res.status(403).json({ message: "Access denied. You can only provide feedback for work orders you created." });
      }

      // Check if feedback already exists
      const existingFeedback = await storage.getFeedbackByWorkOrder(req.body.workOrderId);
      if (existingFeedback) {
        return res.status(400).json({ message: "Feedback already exists for this work order" });
      }

      const feedbackData = insertFeedbackSchema.parse({
        ...req.body,
        givenBy: userId,
        givenTo: workOrder.assigneeId || workOrder.createdById,
      });

      const feedback = await storage.createFeedback(feedbackData);
      
      // Log the feedback action
      await logUserAction(userId, 'feedback_submitted', {
        workOrderId: workOrder.id,
        feedbackId: feedback.id,
        stars: feedback.stars,
        wouldHireAgain: feedback.wouldHireAgain,
      });

      res.json(feedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      res.status(500).json({ message: "Failed to create feedback" });
    }
  });

  // Get feedback for a work order
  app.get('/api/feedback/work-order/:workOrderId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const workOrder = await storage.getWorkOrder(req.params.workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Check permissions
      const canView = isOperationsDirector(currentUser) || 
                     workOrder.createdById === userId ||
                     workOrder.assigneeId === userId ||
                     (currentUser.companyId === workOrder.companyId && hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher']));

      if (!canView) {
        return res.status(403).json({ message: "Access denied." });
      }

      const feedback = await storage.getFeedbackByWorkOrder(req.params.workOrderId);
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // Get feedback for an agent (aggregated)
  app.get('/api/feedback/agent/:agentId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check permissions
      const canView = isOperationsDirector(currentUser) ||
                     req.params.agentId === userId ||
                     hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher']);

      if (!canView) {
        return res.status(403).json({ message: "Access denied." });
      }

      const feedback = await storage.getFeedbackByAgent(req.params.agentId);
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching agent feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // Get all feedback (admin dashboard)
  app.get('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const { stars, dateFrom, dateTo, agentId, limit = 50, offset = 0 } = req.query;
      
      const feedback = await storage.getAllFeedback({
        companyId: isOperationsDirector(currentUser) ? undefined : currentUser.companyId || undefined,
        stars: stars ? parseInt(stars as string) : undefined,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        agentId: agentId as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json(feedback);
    } catch (error) {
      console.error("Error fetching all feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // ===== MODULE 3: JOB VISIBILITY LOGIC ROUTES =====

  // Get visible jobs for field agents based on location and skills
  app.get('/api/jobs/visible', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !isFieldAgent(currentUser)) {
        return res.status(403).json({ message: "Access denied. Field agent role required." });
      }

      const { radiusKm = 50, skillsOnly = false } = req.query;
      
      // Get agent's location and skills
      const agentLocation = await storage.getAgentPrimaryLocation(currentUser.id);
      const agentSkills = await storage.getAgentSkills(currentUser.id);
      
      if (!agentLocation && skillsOnly === 'false') {
        return res.status(400).json({ message: "Agent location not set. Please update your profile." });
      }

      // Get filtered work orders based on visibility logic
      const visibleJobs = await storage.getVisibleJobsForAgent({
        agentId: currentUser.id,
        agentLocation: agentLocation && agentLocation.latitude && agentLocation.longitude ? {
          lat: parseFloat(agentLocation.latitude.toString()),
          lng: parseFloat(agentLocation.longitude.toString())
        } : undefined,
        agentSkills: agentSkills.map(s => s.skillName),
        radiusKm: parseInt(radiusKm as string),
        respectExclusiveNetworks: true
      });

      res.json(visibleJobs);
    } catch (error) {
      console.error("Error fetching visible jobs:", error);
      res.status(500).json({ message: "Failed to fetch visible jobs" });
    }
  });

  // Update agent location and skills for job visibility
  app.put('/api/agent/profile/location', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !isFieldAgent(currentUser)) {
        return res.status(403).json({ message: "Access denied. Field agent role required." });
      }

      const { address, latitude, longitude, isPrimary = true } = req.body;
      
      if (!address || !latitude || !longitude) {
        return res.status(400).json({ message: "Address, latitude, and longitude are required" });
      }

      const location = await storage.createAgentLocation({
        agentId: currentUser.id,
        address,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        isPrimary
      });

      res.json(location);
    } catch (error) {
      console.error("Error updating agent location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Update agent skills for job matching
  app.put('/api/agent/profile/skills', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !isFieldAgent(currentUser)) {
        return res.status(403).json({ message: "Access denied. Field agent role required." });
      }

      const { skills } = req.body;
      
      if (!Array.isArray(skills)) {
        return res.status(400).json({ message: "Skills must be an array" });
      }

      // Remove existing skills and add new ones
      await storage.deleteAgentSkills(currentUser.id);
      
      const newSkills = [];
      for (const skill of skills) {
        const newSkill = await storage.createAgentSkill({
          agentId: currentUser.id,
          skillName: skill.skillName,
          proficiencyLevel: skill.proficiencyLevel || 'intermediate',
          verified: false
        });
        newSkills.push(newSkill);
      }

      res.json(newSkills);
    } catch (error) {
      console.error("Error updating agent skills:", error);
      res.status(500).json({ message: "Failed to update skills" });
    }
  });

  // Get agent's current profile (location and skills)
  app.get('/api/agent/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !isFieldAgent(currentUser)) {
        return res.status(403).json({ message: "Access denied. Field agent role required." });
      }

      const [location, skills] = await Promise.all([
        storage.getAgentPrimaryLocation(currentUser.id),
        storage.getAgentSkills(currentUser.id)
      ]);

      res.json({
        location,
        skills,
        agentInfo: {
          id: currentUser.id,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          email: currentUser.email
        }
      });
    } catch (error) {
      console.error("Error fetching agent profile:", error);
      res.status(500).json({ message: "Failed to fetch agent profile" });
    }
  });

  // ===== PROJECT HEARTBEAT MONITOR ROUTES =====

  // Get project heartbeat for a work order
  app.get('/api/project-heartbeat/:workOrderId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher']))) {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const heartbeat = await storage.getProjectHeartbeat(req.params.workOrderId);
      res.json(heartbeat);
    } catch (error) {
      console.error("Error fetching project heartbeat:", error);
      res.status(500).json({ message: "Failed to fetch project heartbeat" });
    }
  });

  // Create project heartbeat for a work order
  app.post('/api/project-heartbeat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager']))) {
        return res.status(403).json({ message: "Access denied. Manager role required." });
      }

      const heartbeat = await storage.createProjectHeartbeat(req.body);
      res.status(201).json(heartbeat);
    } catch (error) {
      console.error("Error creating project heartbeat:", error);
      res.status(500).json({ message: "Failed to create project heartbeat" });
    }
  });

  // Update project heartbeat
  app.put('/api/project-heartbeat/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager']))) {
        return res.status(403).json({ message: "Access denied. Manager role required." });
      }

      const heartbeat = await storage.updateProjectHeartbeat(req.params.id, req.body);
      res.json(heartbeat);
    } catch (error) {
      console.error("Error updating project heartbeat:", error);
      res.status(500).json({ message: "Failed to update project heartbeat" });
    }
  });

  // Trigger heartbeat event (for field agents to trigger events)
  app.post('/api/project-heartbeat/event', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { workOrderId, eventType, eventData } = req.body;
      
      // Field agents can only trigger certain events for their own work orders
      if (isFieldAgent(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher'])) {
        const workOrder = await storage.getWorkOrder(workOrderId);
        if (!workOrder || workOrder.assigneeId !== currentUser.id) {
          return res.status(403).json({ message: "Access denied. You can only trigger events for your assigned work orders." });
        }
        
        // Field agents can only trigger check-in and deliverable update events
        if (!['check_in', 'deliverable_update'].includes(eventType)) {
          return res.status(403).json({ message: "Access denied. You can only trigger check-in and deliverable update events." });
        }
      }

      await storage.triggerHeartbeatEvent(workOrderId, eventType, eventData, currentUser.id);
      res.json({ success: true, message: "Heartbeat event triggered successfully" });
    } catch (error) {
      console.error("Error triggering heartbeat event:", error);
      res.status(500).json({ message: "Failed to trigger heartbeat event" });
    }
  });

  // Get heartbeat events for a project
  app.get('/api/project-heartbeat/:heartbeatId/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher']))) {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const events = await storage.getHeartbeatEvents(req.params.heartbeatId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching heartbeat events:", error);
      res.status(500).json({ message: "Failed to fetch heartbeat events" });
    }
  });

  // Get project health summary
  app.get('/api/project-health-summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher']))) {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const companyId = isOperationsDirector(currentUser) ? undefined : currentUser.companyId;
      const summary = await storage.getProjectHealthSummary(companyId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching project health summary:", error);
      res.status(500).json({ message: "Failed to fetch project health summary" });
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

  // Exclusive Networks routes
  app.post('/api/exclusive-networks', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      if (!currentUser || !hasRole(currentUser, 'administrator') || !currentUser.companyId) {
        return res.status(403).json({ message: "Only client administrators can manage exclusive networks" });
      }

      const clientCompany = await storage.getCompany(currentUser.companyId);
      if (!clientCompany || clientCompany.type !== 'client') {
        return res.status(403).json({ message: "Only client company administrators can add exclusive networks" });
      }

      const { serviceCompanyId } = req.body;
      
      const exclusiveNetwork = await storage.createExclusiveNetwork({
        clientCompanyId: currentUser.companyId,
        serviceCompanyId,
        addedById: currentUser.id,
      });

      res.json(exclusiveNetwork);
    } catch (error) {
      console.error("Error creating exclusive network:", error);
      res.status(500).json({ message: "Failed to create exclusive network" });
    }
  });

  app.get('/api/exclusive-networks', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      if (!currentUser) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      let exclusiveNetworks;
      if (isOperationsDirector(currentUser)) {
        exclusiveNetworks = await storage.getExclusiveNetworks();
      } else if (currentUser.companyId) {
        const company = await storage.getCompany(currentUser.companyId);
        if (company?.type === 'client') {
          exclusiveNetworks = await storage.getExclusiveNetworks(currentUser.companyId);
        } else if (company?.type === 'service') {
          exclusiveNetworks = await storage.getExclusiveNetworks(undefined, currentUser.companyId);
        }
      }

      res.json(exclusiveNetworks || []);
    } catch (error) {
      console.error("Error fetching exclusive networks:", error);
      res.status(500).json({ message: "Failed to fetch exclusive networks" });
    }
  });

  app.delete('/api/exclusive-networks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasRole(currentUser, 'administrator'))) {
        return res.status(403).json({ message: "Only administrators can remove exclusive networks" });
      }

      await storage.deleteExclusiveNetwork(req.params.id);
      res.json({ message: "Exclusive network removed successfully" });
    } catch (error) {
      console.error("Error removing exclusive network:", error);
      res.status(500).json({ message: "Failed to remove exclusive network" });
    }
  });

  // Base job network endpoint - returns work orders for job network page
  app.get('/api/job-network', isAuthenticatedWithODBypass, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      const { testingRole, testingCompanyType } = getTestingRoleInfo(req);
      
      // Check if user can view job network using schema function (includes OD bypass)
      if (!currentUser || !canViewJobNetwork(currentUser, testingRole, testingCompanyType)) {
        return res.status(403).json({ message: "Access denied. Management or client role required." });
      }

      const workOrders = await storage.getJobNetworkWorkOrders();
      res.json(workOrders);
    } catch (error) {
      console.error("Error fetching job network work orders:", error);
      res.status(500).json({ message: "Failed to fetch job network work orders" });
    }
  });

  // Job network work orders (client-created orders for management assignment)
  app.get('/api/job-network/work-orders', isAuthenticatedWithODBypass, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      const { testingRole, testingCompanyType } = getTestingRoleInfo(req);
      
      // Check if user can view job network using schema function (includes OD bypass)
      if (!currentUser || !canViewJobNetwork(currentUser, testingRole, testingCompanyType)) {
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
  app.post('/api/job-network/request-assignment', isAuthenticatedWithODBypass, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      const { testingRole, testingCompanyType } = getTestingRoleInfo(req);
      
      // Check if user can view job network using schema function (includes OD bypass)
      if (!currentUser || !canViewJobNetwork(currentUser, testingRole, testingCompanyType)) {
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
  app.patch('/api/work-orders/:workOrderId/assign', isAuthenticatedWithODBypass, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      const { testingRole, testingCompanyType } = getTestingRoleInfo(req);
      
      // Check if user can manage work orders using schema function (includes OD bypass)
      if (!currentUser || !canManageWorkOrders(currentUser, testingRole, testingCompanyType)) {
        return res.status(403).json({ message: "Access denied. Management role required." });
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


  // Work Order Request Routes
  
  // Create work order request from job network
  app.post('/api/work-order-requests', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher'])) {
        return res.status(403).json({ message: "Access denied. Admin team role required." });
      }

      const requestData = insertWorkOrderRequestSchema.parse(req.body);
      const request = await storage.createWorkOrderRequest(requestData);
      res.json(request);
    } catch (error) {
      console.error("Error creating work order request:", error);
      res.status(500).json({ message: "Failed to create work order request" });
    }
  });

  // Get work order requests for client company
  app.get('/api/work-order-requests/client/:clientCompanyId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher', 'client'])) {
        return res.status(403).json({ message: "Access denied. Admin team or client role required." });
      }

      const { clientCompanyId } = req.params;
      
      // Ensure user can only access their own company's requests
      if (currentUser.companyId !== clientCompanyId && !hasAnyRole(currentUser, ['operations_director'])) {
        return res.status(403).json({ message: "Access denied. Can only view your company's requests." });
      }

      const requests = await storage.getWorkOrderRequestsByClient(clientCompanyId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching client work order requests:", error);
      res.status(500).json({ message: "Failed to fetch work order requests" });
    }
  });

  // Get work order requests for service company
  app.get('/api/work-order-requests/service/:serviceCompanyId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher'])) {
        return res.status(403).json({ message: "Access denied. Service company admin team role required." });
      }

      const { serviceCompanyId } = req.params;
      
      // Ensure user can only access their own company's requests
      if (currentUser.companyId !== serviceCompanyId && !hasAnyRole(currentUser, ['operations_director'])) {
        return res.status(403).json({ message: "Access denied. Can only view your company's requests." });
      }

      const requests = await storage.getWorkOrderRequestsByServiceCompany(serviceCompanyId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching service company work order requests:", error);
      res.status(500).json({ message: "Failed to fetch work order requests" });
    }
  });

  // Respond to work order request
  app.patch('/api/work-order-requests/:requestId/respond', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher', 'client'])) {
        return res.status(403).json({ message: "Access denied. Admin team or client role required." });
      }

      const { requestId } = req.params;
      const { status, clientResponse } = req.body;

      if (!['approved', 'declined'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'declined'." });
      }

      const updatedRequest = await storage.respondToWorkOrderRequest(
        requestId, 
        status, 
        currentUser.id, 
        clientResponse
      );
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error responding to work order request:", error);
      res.status(500).json({ message: "Failed to respond to work order request" });
    }
  });

  // Project budget deduction workflow endpoints
  app.patch('/api/projects/:projectId/approve-budget', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'project_manager']))) {
        return res.status(403).json({ message: "Only administrators and project managers can approve budgets" });
      }

      const project = await storage.approveBudget(req.params.projectId, currentUser.id);
      res.json(project);
    } catch (error) {
      console.error("Error approving project budget:", error);
      res.status(500).json({ message: "Failed to approve project budget" });
    }
  });

  app.patch('/api/projects/:projectId/deduct-budget', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasRole(currentUser, 'administrator'))) {
        return res.status(403).json({ message: "Only administrators can deduct project budgets" });
      }

      const { actualCost } = req.body;
      const project = await storage.deductBudget(req.params.projectId, actualCost);
      res.json(project);
    } catch (error) {
      console.error("Error deducting project budget:", error);
      res.status(500).json({ message: "Failed to deduct project budget" });
    }
  });

  app.patch('/api/projects/:projectId/cancel-budget', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'project_manager']))) {
        return res.status(403).json({ message: "Only administrators and project managers can cancel budget approval" });
      }

      const project = await storage.cancelBudgetApproval(req.params.projectId);
      res.json(project);
    } catch (error) {
      console.error("Error canceling budget approval:", error);
      res.status(500).json({ message: "Failed to cancel budget approval" });
    }
  });

  app.get('/api/projects/budget-status/:status?', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'project_manager', 'manager']))) {
        return res.status(403).json({ message: "Access denied" });
      }

      const projects = await storage.getProjectsBudgetStatus(req.params.status);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects by budget status:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Client final approval and profit calculation endpoints
  app.patch('/api/work-orders/:workOrderId/client-approval', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasRole(currentUser, 'client'))) {
        return res.status(403).json({ message: "Only clients can approve work orders" });
      }

      const { status, notes } = req.body;
      
      if (!['approved', 'rejected', 'requires_revision'].includes(status)) {
        return res.status(400).json({ message: "Invalid approval status" });
      }

      const workOrder = await storage.clientApprovalWorkOrder(req.params.workOrderId, status, currentUser.id, notes);
      res.json(workOrder);
    } catch (error) {
      console.error("Error processing client approval:", error);
      res.status(500).json({ message: "Failed to process client approval" });
    }
  });

  app.post('/api/work-orders/:workOrderId/calculate-profit', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'project_manager', 'manager']))) {
        return res.status(403).json({ message: "Only management can calculate profit" });
      }

      const workOrder = await storage.calculateProfit(req.params.workOrderId);
      res.json(workOrder);
    } catch (error) {
      console.error("Error calculating profit:", error);
      res.status(500).json({ message: "Failed to calculate profit" });
    }
  });

  // Approval requests API endpoints
  app.get('/api/approval-requests', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      if (!currentUser) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      let approvals = [];
      
      if (isOperationsDirector(currentUser)) {
        // Operations Director sees all pending approvals
        approvals = await storage.getAllApprovalRequests();
      } else if (hasAnyRole(currentUser, ['administrator', 'manager'])) {
        // Admin Teams see approvals for their company
        approvals = await storage.getApprovalRequests(currentUser.id);
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(approvals);
    } catch (error) {
      console.error("Error fetching approval requests:", error);
      res.status(500).json({ message: "Failed to fetch approval requests" });
    }
  });

  app.patch('/api/approval-requests/:id/review', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager']))) {
        return res.status(403).json({ message: "Only admin teams can review approval requests" });
      }

      const { status, response } = req.body;
      
      if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'denied'" });
      }

      const approval = await storage.reviewApprovalRequest(req.params.id, status, currentUser.id, response);
      res.json(approval);
    } catch (error) {
      console.error("Error reviewing approval request:", error);
      res.status(500).json({ message: "Failed to review approval request" });
    }
  });

  app.get('/api/work-orders/pending-approvals/:clientCompanyId?', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      if (!currentUser) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      let workOrders;
      if (isOperationsDirector(currentUser)) {
        workOrders = await storage.getPendingClientApprovals(req.params.clientCompanyId);
      } else if (hasRole(currentUser, 'client') && currentUser.companyId) {
        workOrders = await storage.getPendingClientApprovals(currentUser.companyId);
      } else if (hasAnyRole(currentUser, ['administrator', 'manager', 'project_manager'])) {
        workOrders = await storage.getPendingClientApprovals();
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(workOrders);
    } catch (error) {
      console.error("Error fetching pending client approvals:", error);
      res.status(500).json({ message: "Failed to fetch pending approvals" });
    }
  });

  app.get('/api/work-orders/completed-for-approval', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager', 'project_manager']))) {
        return res.status(403).json({ message: "Management access required" });
      }

      const workOrders = await storage.getCompletedWorkOrdersForApproval();
      res.json(workOrders);
    } catch (error) {
      console.error("Error fetching completed work orders for approval:", error);
      res.status(500).json({ message: "Failed to fetch completed work orders" });
    }
  });

  // Get job network posts
  app.get('/api/job-network-posts', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher', 'client'])) {
        return res.status(403).json({ message: "Access denied. Admin team or client role required." });
      }

      const posts = await storage.getJobNetworkPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching job network posts:", error);
      res.status(500).json({ message: "Failed to fetch job network posts" });
    }
  });

  // Get exclusive network posts
  app.get('/api/exclusive-network-posts', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || (!isOperationsDirector(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager', 'dispatcher']))) {
        return res.status(403).json({ message: "Access denied. Admin team role or Operations Director required." });
      }

      const posts = await storage.getExclusiveNetworkPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching exclusive network posts:", error);
      res.status(500).json({ message: "Failed to fetch exclusive network posts" });
    }
  });

  // ===== EXCLUSIVE NETWORK MANAGEMENT ROUTES =====

  // Get exclusive network members for a client company
  app.get('/api/exclusive-network/:clientCompanyId/members', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || (!isClient(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager']))) {
        return res.status(403).json({ message: "Access denied." });
      }

      const members = await storage.getExclusiveNetworkMembers(req.params.clientCompanyId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching exclusive network members:", error);
      res.status(500).json({ message: "Failed to fetch exclusive network members" });
    }
  });

  // Create exclusive network member relationship
  app.post('/api/exclusive-network/members', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isClient(currentUser)) {
        return res.status(403).json({ message: "Access denied. Client role required." });
      }

      const memberData = insertExclusiveNetworkMemberSchema.parse({
        ...req.body,
        clientCompanyId: currentUser.companyId || req.body.clientCompanyId,
      });

      const member = await storage.createExclusiveNetworkMember(memberData);
      res.json(member);
    } catch (error) {
      console.error("Error creating exclusive network member:", error);
      res.status(500).json({ message: "Failed to create exclusive network member" });
    }
  });

  // Check exclusive network eligibility
  app.get('/api/exclusive-network/eligibility/:clientCompanyId/:serviceCompanyId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || (!isOperationsDirector(currentUser) && !isClient(currentUser) && !hasAnyRole(currentUser, ['administrator', 'manager']))) {
        return res.status(403).json({ message: "Access denied." });
      }

      const { clientCompanyId, serviceCompanyId } = req.params;
      const isEligible = await storage.checkExclusiveNetworkEligibility(clientCompanyId, serviceCompanyId);
      res.json({ eligible: isEligible });
    } catch (error) {
      console.error("Error checking exclusive network eligibility:", error);
      res.status(500).json({ message: "Failed to check eligibility" });
    }
  });

  // Approve and pay work order (for client admins)
  app.patch('/api/work-orders/:id/approve-and-pay', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isClient(currentUser)) {
        return res.status(403).json({ message: "Access denied. Client role required." });
      }

      const workOrder = await storage.getWorkOrder(req.params.id);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Verify the work order belongs to the client's company
      if (workOrder.companyId !== currentUser.companyId) {
        return res.status(403).json({ message: "Access denied. Work order not from your company." });
      }

      // Verify work order is completed
      if (workOrder.status !== 'completed') {
        return res.status(400).json({ message: "Work order must be completed before approval." });
      }

      // Update work order to approved and paid status
      const updatedWorkOrder = await storage.updateWorkOrder(req.params.id, {
        paymentStatus: 'paid',
        assignmentProgress: 'PAID',
        pathToCompletion: 'paid',
        progressIndicator: 'paid',
        paymentUpdatedById: currentUser.id,
        paymentUpdatedAt: new Date()
      });

      res.json(updatedWorkOrder);
    } catch (error) {
      console.error("Error approving and paying work order:", error);
      res.status(500).json({ message: "Failed to approve and pay work order" });
    }
  });

  // Operations Director specific routes for exclusive network management
  app.get('/api/operations/exclusive-network-members', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ message: "Access denied. Operations Director role required." });
      }

      const members = await storage.getAllExclusiveNetworkMembers();
      res.json(members);
    } catch (error) {
      console.error("Error fetching all exclusive network members:", error);
      res.status(500).json({ message: "Failed to fetch exclusive network members" });
    }
  });

  app.get('/api/operations/exclusive-network-posts', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ message: "Access denied. Operations Director role required." });
      }

      const posts = await storage.getExclusiveNetworkPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching exclusive network posts for operations:", error);
      res.status(500).json({ message: "Failed to fetch exclusive network posts" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let currentUser = await storage.getUser(userId);
      
      // Check if user is testing a role (for Operations Directors)
      const testingRole = req.headers['x-testing-role'];
      const testingCompanyType = req.headers['x-testing-company-type'];
      
      console.log('Projects GET API - role testing headers:', testingRole, testingCompanyType);
      console.log('Projects GET API - current user:', currentUser?.email, currentUser?.roles);
      
      if (currentUser && isOperationsDirector(currentUser) && testingRole) {
        // Switch to test user based on role and company type
        console.log('Projects GET API - role testing detected, switching user...');
        let testUserEmail = '';
        
        if (testingRole === 'project_manager') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testprojectmanager@testclient.com'
            : 'testprojectmanager@testcompany.com';
        } else if (testingRole === 'administrator') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testadmin@testclient.com'
            : 'testadmin@testcompany.com';
        } else if (testingRole === 'manager') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testmanager@testclient.com'
            : 'testmanager@testcompany.com';
        } else if (testingRole === 'dispatcher') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testdispatcher@testclient.com'
            : 'testdispatcher@testcompany.com';
        } else if (testingRole === 'field_engineer') {
          testUserEmail = 'testfieldengineer@testcompany.com';
        } else if (testingRole === 'field_agent') {
          testUserEmail = 'testfieldagent@testcompany.com';
        }
        
        if (testUserEmail) {
          const testUser = await storage.getUserByEmail(testUserEmail);
          if (testUser) {
            currentUser = testUser;
          }
        }
      }
      
      if (!currentUser || !canViewProjectNetwork(currentUser)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let currentUser = await storage.getUser(userId);
      
      // Check if user is testing a role (for Operations Directors)
      const testingRole = req.headers['x-testing-role'];
      const testingCompanyType = req.headers['x-testing-company-type'];
      
      if (currentUser && isOperationsDirector(currentUser) && testingRole) {
        // Switch to test user based on role and company type
        let testUserEmail = '';
        
        if (testingRole === 'project_manager') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testprojectmanager@testclient.com'
            : 'testprojectmanager@testcompany.com';
        } else if (testingRole === 'administrator') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testadmin@testclient.com'
            : 'testadmin@testcompany.com';
        } else if (testingRole === 'manager') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testmanager@testclient.com'
            : 'testmanager@testcompany.com';
        } else if (testingRole === 'dispatcher') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testdispatcher@testclient.com'
            : 'testdispatcher@testcompany.com';
        } else if (testingRole === 'field_engineer') {
          testUserEmail = 'testfieldengineer@testcompany.com';
        } else if (testingRole === 'field_agent') {
          testUserEmail = 'testfieldagent@testcompany.com';
        }
        
        if (testUserEmail) {
          const testUser = await storage.getUserByEmail(testUserEmail);
          if (testUser) {
            currentUser = testUser;
          }
        }
      }
      
      if (!currentUser || !canCreateProjects(currentUser)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.post('/api/projects/:id/request', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !canViewProjectNetwork(currentUser)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const projectId = req.params.id;
      const assignment = await storage.requestProjectAssignment(projectId, currentUser.companyId!, currentUser.id);
      res.json(assignment);
    } catch (error) {
      console.error("Error requesting project assignment:", error);
      res.status(500).json({ message: "Failed to request project assignment" });
    }
  });

  // Access Request routes for unregistered users requesting access
  app.post('/api/access-requests', async (req: any, res) => {
    try {
      const requestData = insertAccessRequestSchema.parse(req.body);
      const accessRequest = await storage.createAccessRequest(requestData);
      res.json(accessRequest);
    } catch (error) {
      console.error("Error creating access request:", error);
      res.status(500).json({ message: "Failed to create access request" });
    }
  });

  // Get all pending access requests - Operations Director only
  app.get('/api/access-requests', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ message: "Access denied. Operations Director required." });
      }

      const accessRequests = await storage.getPendingAccessRequests();
      res.json(accessRequests);
    } catch (error) {
      console.error("Error fetching access requests:", error);
      res.status(500).json({ message: "Failed to fetch access requests" });
    }
  });

  // Review access request - Operations Director only
  app.patch('/api/access-requests/:requestId/review', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ message: "Access denied. Operations Director required." });
      }

      const { requestId } = req.params;
      const { status, notes } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'rejected'." });
      }

      const updatedRequest = await storage.reviewAccessRequest(requestId, status, currentUser.id, notes);
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error reviewing access request:", error);
      res.status(500).json({ message: "Failed to review access request" });
    }
  });

  // Job Request routes - Field Agents can request assignment to work orders
  app.post('/api/job-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let currentUser = await storage.getUser(userId);
      
      // Check if user is testing a role (for Operations Directors)
      const testingRole = req.headers['x-testing-role'];
      const testingCompanyType = req.headers['x-testing-company-type'];
      
      if (currentUser && isOperationsDirector(currentUser) && testingRole) {
        // Switch to test user based on role and company type
        let testUserEmail = '';
        
        if (testingRole === 'field_agent') {
          testUserEmail = 'testfieldagent@testcompany.com';
        } else if (testingRole === 'field_engineer') {
          testUserEmail = 'testfieldengineer@testcompany.com';
        }
        
        if (testUserEmail) {
          const testUser = await storage.getUserByEmail(testUserEmail);
          if (testUser) {
            currentUser = testUser;
          }
        }
      }
      
      if (!currentUser || !isFieldLevel(currentUser)) {
        return res.status(403).json({ message: "Access denied. Field Agents and Field Engineers only." });
      }

      const requestData = insertJobRequestSchema.parse(req.body);
      
      // Ensure the agent is the current user
      const jobRequest = await storage.createJobRequest({
        ...requestData,
        agentId: currentUser.id,
      });
      
      res.json(jobRequest);
    } catch (error) {
      console.error("Error creating job request:", error);
      res.status(500).json({ message: "Failed to create job request" });
    }
  });

  // Get job requests for a company (for admin review)
  app.get('/api/job-requests/company/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let currentUser = await storage.getUser(userId);
      
      // Check if user is testing a role (for Operations Directors)
      const testingRole = req.headers['x-testing-role'];
      const testingCompanyType = req.headers['x-testing-company-type'];
      
      if (currentUser && isOperationsDirector(currentUser) && testingRole) {
        // Switch to test user based on role and company type
        let testUserEmail = '';
        
        if (testingRole === 'administrator') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testadmin@testclient.com'
            : 'testadmin@testcompany.com';
        } else if (testingRole === 'manager') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testmanager@testclient.com'
            : 'testmanager@testcompany.com';
        } else if (testingRole === 'dispatcher') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testdispatcher@testclient.com'
            : 'testdispatcher@testcompany.com';
        }
        
        if (testUserEmail) {
          const testUser = await storage.getUserByEmail(testUserEmail);
          if (testUser) {
            currentUser = testUser;
          }
        }
      }
      
      if (!currentUser || !canManageWorkOrders(currentUser)) {
        return res.status(403).json({ message: "Access denied. Admin team required." });
      }

      const companyId = req.params.companyId;
      const jobRequests = await storage.getJobRequestsByCompany(companyId);
      res.json(jobRequests);
    } catch (error) {
      console.error("Error fetching job requests:", error);
      res.status(500).json({ message: "Failed to fetch job requests" });
    }
  });

  // Get job requests for a specific agent
  app.get('/api/job-requests/agent/:agentId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let currentUser = await storage.getUser(userId);
      
      // Check if user is testing a role (for Operations Directors)
      const testingRole = req.headers['x-testing-role'];
      const testingCompanyType = req.headers['x-testing-company-type'];
      
      if (currentUser && isOperationsDirector(currentUser) && testingRole) {
        // Switch to test user based on role and company type
        let testUserEmail = '';
        
        if (testingRole === 'field_agent') {
          testUserEmail = 'testfieldagent@testcompany.com';
        } else if (testingRole === 'field_engineer') {
          testUserEmail = 'testfieldengineer@testcompany.com';
        }
        
        if (testUserEmail) {
          const testUser = await storage.getUserByEmail(testUserEmail);
          if (testUser) {
            currentUser = testUser;
          }
        }
      }
      
      const agentId = req.params.agentId;
      
      // Users can only view their own job requests unless they're admin
      if (!currentUser || (currentUser.id !== agentId && !canManageWorkOrders(currentUser))) {
        return res.status(403).json({ message: "Access denied." });
      }

      const jobRequests = await storage.getJobRequestsByAgent(agentId);
      res.json(jobRequests);
    } catch (error) {
      console.error("Error fetching job requests:", error);
      res.status(500).json({ message: "Failed to fetch job requests" });
    }
  });

  // Review job request (approve/reject)
  app.patch('/api/job-requests/:requestId/review', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let currentUser = await storage.getUser(userId);
      
      // Check if user is testing a role (for Operations Directors)
      const testingRole = req.headers['x-testing-role'];
      const testingCompanyType = req.headers['x-testing-company-type'];
      
      if (currentUser && isOperationsDirector(currentUser) && testingRole) {
        // Switch to test user based on role and company type
        let testUserEmail = '';
        
        if (testingRole === 'administrator') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testadmin@testclient.com'
            : 'testadmin@testcompany.com';
        } else if (testingRole === 'manager') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testmanager@testclient.com'
            : 'testmanager@testcompany.com';
        } else if (testingRole === 'dispatcher') {
          testUserEmail = testingCompanyType === 'client' 
            ? 'testdispatcher@testclient.com'
            : 'testdispatcher@testcompany.com';
        }
        
        if (testUserEmail) {
          const testUser = await storage.getUserByEmail(testUserEmail);
          if (testUser) {
            currentUser = testUser;
          }
        }
      }
      
      if (!currentUser || !canManageWorkOrders(currentUser)) {
        return res.status(403).json({ message: "Access denied. Admin team required." });
      }

      const { requestId } = req.params;
      const { status, rejectionReason } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'rejected'." });
      }

      const updatedRequest = await storage.reviewJobRequest(requestId, status, currentUser.id, rejectionReason);
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error reviewing job request:", error);
      res.status(500).json({ message: "Failed to review job request" });
    }
  });

  // ==================================================
  // JOB REQUESTS ROUTES
  // ==================================================
  
  // Create job request (field agents requesting work orders)
  app.post("/api/job-requests", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { workOrderId, message } = req.body;
      
      if (!workOrderId) {
        return res.status(400).json({ error: "Work order ID is required" });
      }

      // Check if work order exists and is unassigned
      const workOrder = await storage.getWorkOrder(workOrderId);
      if (!workOrder) {
        return res.status(404).json({ error: "Work order not found" });
      }

      if (workOrder.assigneeId) {
        return res.status(400).json({ error: "Work order is already assigned" });
      }

      // Check if user already has a pending request for this work order
      const existingRequests = await storage.getJobRequestsByAgent(currentUser.id);
      const existingRequest = existingRequests.find(r => 
        r.workOrderId === workOrderId && r.status === 'requested'
      );
      
      if (existingRequest) {
        return res.status(400).json({ error: "You already have a pending request for this work order" });
      }

      const jobRequest = await storage.createJobRequest({
        workOrderId,
        agentId: currentUser.id,
        message,
        status: 'requested',
        requestedAt: new Date(),
      });

      res.json(jobRequest);
    } catch (error) {
      console.error("Error creating job request:", error);
      res.status(500).json({ error: "Failed to create job request" });
    }
  });

  // Get job requests for admin review (by company)
  app.get("/api/job-requests/company/:companyId", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { companyId } = req.params;
      const userRoles = currentUser.roles || [];
      
      // Only administrators, managers, and dispatchers can view job requests
      if (!userRoles.some((role: string) => ['administrator', 'manager', 'dispatcher'].includes(role))) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const jobRequests = await storage.getJobRequestsByCompany(companyId);
      res.json(jobRequests);
    } catch (error) {
      console.error("Error fetching job requests:", error);
      res.status(500).json({ error: "Failed to fetch job requests" });
    }
  });

  // Review job request (approve/reject)
  app.patch("/api/job-requests/:requestId/review", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { requestId } = req.params;
      const { status, rejectionReason } = req.body;
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
      }

      const userRoles = currentUser.roles || [];
      
      // Only administrators, managers, and dispatchers can review job requests
      if (!userRoles.some((role: string) => ['administrator', 'manager', 'dispatcher'].includes(role))) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const reviewData = {
        status: status as 'approved' | 'rejected',
        reviewedBy: currentUser.id,
        rejectionReason,
      };

      const reviewedRequest = await storage.reviewJobRequest(requestId, reviewData);
      res.json(reviewedRequest);
    } catch (error) {
      console.error("Error reviewing job request:", error);
      res.status(500).json({ error: "Failed to review job request" });
    }
  });

  // Onboarding Request routes
  // Public route for contractor applications - no authentication required
  app.post('/api/onboarding-requests', async (req, res) => {
    try {
      const validatedData = insertOnboardingRequestSchema.parse(req.body);
      const request = await storage.createOnboardingRequest(validatedData);
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating onboarding request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create onboarding request" });
    }
  });

  // Get all onboarding requests - Operations Director only
  app.get('/api/onboarding-requests', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ error: "Access denied. Operations Director role required." });
      }

      const requests = await storage.getAllOnboardingRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching onboarding requests:", error);
      res.status(500).json({ error: "Failed to fetch onboarding requests" });
    }
  });

  // Review onboarding request - Operations Director only
  app.patch('/api/onboarding-requests/:id/review', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ error: "Access denied. Operations Director role required." });
      }

      const { id } = req.params;
      const { status, rejectionReason } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'approved' or 'rejected'." });
      }

      if (status === 'rejected' && !rejectionReason?.trim()) {
        return res.status(400).json({ error: "Rejection reason is required when rejecting an application." });
      }

      const reviewedRequest = await storage.reviewOnboardingRequest(
        id, 
        status, 
        currentUser.id, 
        rejectionReason?.trim()
      );

      res.json(reviewedRequest);
    } catch (error) {
      console.error("Error reviewing onboarding request:", error);
      res.status(500).json({ error: "Failed to review onboarding request" });
    }
  });

  // Job Messages routes
  // Create job message - authenticated users with work order access
  app.post('/api/job-messages', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ error: "User not found" });
      }

      const validatedData = insertJobMessageSchema.parse(req.body);
      
      // Verify user has access to this work order
      const workOrder = await storage.getWorkOrder(validatedData.workOrderId);
      if (!workOrder) {
        return res.status(404).json({ error: "Work order not found" });
      }

      // Check if user is involved in the work order (assigned agent, creator, or admin team)
      const hasAccess = workOrder.assigneeId === currentUser.id || 
                       workOrder.createdById === currentUser.id ||
                       isAdmin(currentUser) ||
                       isOperationsDirector(currentUser);

      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied. You must be involved in this work order to send messages." });
      }

      // Add sender ID to message
      const messageData = {
        ...validatedData,
        senderId: currentUser.id,
      };

      const message = await storage.createJobMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating job message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid message data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create job message" });
    }
  });

  // Get job messages for work order - authenticated users with work order access
  app.get('/api/job-messages', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ error: "User not found" });
      }

      const { workOrderId } = req.query;
      if (!workOrderId) {
        return res.status(400).json({ error: "Work order ID is required" });
      }

      // Verify user has access to this work order
      const workOrder = await storage.getWorkOrder(workOrderId);
      if (!workOrder) {
        return res.status(404).json({ error: "Work order not found" });
      }

      // Check if user is involved in the work order (assigned agent, creator, or admin team)
      const hasAccess = workOrder.assigneeId === currentUser.id || 
                       workOrder.createdById === currentUser.id ||
                       isAdmin(currentUser) ||
                       isOperationsDirector(currentUser);

      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied. You must be involved in this work order to view messages." });
      }

      const messages = await storage.getJobMessagesByWorkOrder(workOrderId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching job messages:", error);
      res.status(500).json({ error: "Failed to fetch job messages" });
    }
  });

  // Update job message - sender only
  app.patch('/api/job-messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ error: "User not found" });
      }

      const { id } = req.params;
      const { message, isImportant } = req.body;

      // Get the current message to verify ownership
      const messages = await storage.getJobMessagesByWorkOrder(''); // This will need to be fixed
      const currentMessage = messages.find(m => m.id === id);
      
      if (!currentMessage) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Only sender can edit their message
      if (currentMessage.senderId !== currentUser.id) {
        return res.status(403).json({ error: "You can only edit your own messages" });
      }

      const updatedMessage = await storage.updateJobMessage(id, { message, isImportant });
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error updating job message:", error);
      res.status(500).json({ error: "Failed to update job message" });
    }
  });

  // Pin/unpin job message - admin team only
  app.patch('/api/job-messages/:id/pin', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isAdmin(currentUser)) {
        return res.status(403).json({ error: "Access denied. Admin role required to pin messages." });
      }

      const { id } = req.params;
      const { isPinned } = req.body;

      const updatedMessage = isPinned 
        ? await storage.pinJobMessage(id)
        : await storage.unpinJobMessage(id);
      
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error pinning/unpinning job message:", error);
      res.status(500).json({ error: "Failed to pin/unpin job message" });
    }
  });

  // Audit Log routes
  // Get audit logs for admin dashboard - Admin team and Operations Director only
  app.get('/api/audit-logs', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || (!isOperationsDirector(currentUser) && !isAdmin(currentUser))) {
        return res.status(403).json({ error: "Access denied. Admin role or Operations Director required." });
      }

      const { entityType, userId, startDate, endDate, limit = 50, offset = 0 } = req.query;
      
      const filters: any = {};
      if (entityType) filters.entityType = entityType;
      if (userId) filters.userId = userId;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const auditLogs = await storage.getAuditLogsForAdmin(filters);
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Get audit logs for a specific entity - Admin team and Operations Director only
  app.get('/api/audit-logs/entity/:entityType/:entityId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || (!isOperationsDirector(currentUser) && !isAdmin(currentUser))) {
        return res.status(403).json({ error: "Access denied. Admin role or Operations Director required." });
      }

      const { entityType, entityId } = req.params;
      const auditLogs = await storage.getAuditLogsByEntity(entityType, entityId);
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching entity audit logs:", error);
      res.status(500).json({ error: "Failed to fetch entity audit logs" });
    }
  });

  // Get all audit logs with pagination - Operations Director only
  app.get('/api/audit-logs/all', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !isOperationsDirector(currentUser)) {
        return res.status(403).json({ error: "Access denied. Operations Director role required." });
      }

      const { limit = 100, offset = 0 } = req.query;
      const auditLogs = await storage.getAllAuditLogs(Number(limit), Number(offset));
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching all audit logs:", error);
      res.status(500).json({ error: "Failed to fetch all audit logs" });
    }
  });

  // ===== PHASE 1 EXPANSION MODULE ROUTES =====

  // Module 11: Job Category Profitability Analysis
  app.get('/api/category-performance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      const metrics = await storage.getCategoryPerformanceMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching category performance:", error);
      res.status(500).json({ message: "Failed to fetch category performance metrics" });
    }
  });

  // Module 14: Bid & Proposal System

  // Create bid
  app.post('/api/bids', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['field_agent', 'field_engineer', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied." });
      }

      // Validate the work order exists and is biddable
      const workOrder = await storage.getWorkOrder(req.body.workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      if (workOrder.status !== 'scheduled' && workOrder.status !== 'pending') {
        return res.status(400).json({ message: "Work order is not available for bidding" });
      }

      const bidData = {
        ...req.body,
        userId,
        companyId: currentUser.companyId,
        status: 'pending' as const,
      };

      const bid = await storage.createBid(bidData);
      res.status(201).json(bid);
    } catch (error) {
      console.error("Error creating bid:", error);
      res.status(500).json({ message: "Failed to create bid" });
    }
  });

  // Get bids for work order
  app.get('/api/work-orders/:workOrderId/bids', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { workOrderId } = req.params;
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const workOrder = await storage.getWorkOrder(workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Only operations director, work order creator, or company admins can see all bids
      if (!isOperationsDirector(currentUser) && 
          workOrder.createdById !== userId && 
          workOrder.companyId !== currentUser.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const bids = await storage.getBidsForWorkOrder(workOrderId);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  // Get user's bids
  app.get('/api/users/:userId/bids', isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(requestingUserId);
      const { userId } = req.params;
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Users can only see their own bids unless they're admins or operations director
      if (userId !== requestingUserId && 
          !isOperationsDirector(currentUser) && 
          !hasAnyRole(currentUser, ['administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied" });
      }

      const bids = await storage.getBidsForUser(userId);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching user bids:", error);
      res.status(500).json({ message: "Failed to fetch user bids" });
    }
  });

  // Accept bid
  app.put('/api/bids/:bidId/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { bidId } = req.params;
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      const bid = await storage.getBid(bidId);
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }

      const workOrder = await storage.getWorkOrder(bid.workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Verify user can accept bids for this work order
      if (!isOperationsDirector(currentUser) && workOrder.companyId !== currentUser.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const acceptedBid = await storage.acceptBid(bidId, userId);
      res.json(acceptedBid);
    } catch (error) {
      console.error("Error accepting bid:", error);
      res.status(500).json({ message: "Failed to accept bid" });
    }
  });

  // Reject bid
  app.put('/api/bids/:bidId/reject', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { bidId } = req.params;
      const { notes } = req.body;
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      const bid = await storage.getBid(bidId);
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }

      const workOrder = await storage.getWorkOrder(bid.workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Verify user can reject bids for this work order
      if (!isOperationsDirector(currentUser) && workOrder.companyId !== currentUser.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const rejectedBid = await storage.rejectBid(bidId, notes);
      res.json(rejectedBid);
    } catch (error) {
      console.error("Error rejecting bid:", error);
      res.status(500).json({ message: "Failed to reject bid" });
    }
  });

  // Module 15: Credential & Compliance Vault

  // Create credential
  app.post('/api/credentials', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const credentialData = {
        ...req.body,
        userId: req.body.userId || userId, // Allow admins to create for others
      };

      // Only operations director, admins, or the user themselves can create credentials
      if (credentialData.userId !== userId && 
          !isOperationsDirector(currentUser) && 
          !hasAnyRole(currentUser, ['administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied" });
      }

      const credential = await storage.createCredential(credentialData);
      res.status(201).json(credential);
    } catch (error) {
      console.error("Error creating credential:", error);
      res.status(500).json({ message: "Failed to create credential" });
    }
  });

  // Get user credentials
  app.get('/api/users/:userId/credentials', isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(requestingUserId);
      const { userId } = req.params;
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Users can see their own credentials, admins can see company credentials
      if (userId !== requestingUserId && 
          !isOperationsDirector(currentUser) && 
          !hasAnyRole(currentUser, ['administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied" });
      }

      const credentials = await storage.getUserCredentials(userId);
      res.json(credentials);
    } catch (error) {
      console.error("Error fetching user credentials:", error);
      res.status(500).json({ message: "Failed to fetch credentials" });
    }
  });

  // Update credential
  app.put('/api/credentials/:credentialId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { credentialId } = req.params;
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const credential = await storage.getCredential(credentialId);
      if (!credential) {
        return res.status(404).json({ message: "Credential not found" });
      }

      // Only the credential owner, operations director, or admins can update
      if (credential.userId !== userId && 
          !isOperationsDirector(currentUser) && 
          !hasAnyRole(currentUser, ['administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedCredential = await storage.updateCredential(credentialId, req.body);
      res.json(updatedCredential);
    } catch (error) {
      console.error("Error updating credential:", error);
      res.status(500).json({ message: "Failed to update credential" });
    }
  });

  // Get expiring credentials
  app.get('/api/credentials/expiring', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { days = 30 } = req.query;
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      const expiringCredentials = await storage.getExpiringCredentials(Number(days));
      res.json(expiringCredentials);
    } catch (error) {
      console.error("Error fetching expiring credentials:", error);
      res.status(500).json({ message: "Failed to fetch expiring credentials" });
    }
  });

  // Delete credential
  app.delete('/api/credentials/:credentialId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { credentialId } = req.params;
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const credential = await storage.getCredential(credentialId);
      if (!credential) {
        return res.status(404).json({ message: "Credential not found" });
      }

      // Only the credential owner, operations director, or admins can delete
      if (credential.userId !== userId && 
          !isOperationsDirector(currentUser) && 
          !hasAnyRole(currentUser, ['administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteCredential(credentialId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting credential:", error);
      res.status(500).json({ message: "Failed to delete credential" });
    }
  });

  // Module 16: Field Agent Recognition & Achievements

  // Create recognition
  app.post('/api/recognition', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      const recognitionData = {
        ...req.body,
        awardedById: userId,
      };

      const recognition = await storage.createRecognition(recognitionData);
      res.status(201).json(recognition);
    } catch (error) {
      console.error("Error creating recognition:", error);
      res.status(500).json({ message: "Failed to create recognition" });
    }
  });

  // Get user recognition
  app.get('/api/users/:userId/recognition', isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(requestingUserId);
      const { userId } = req.params;
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Users can see their own recognition, admins can see company recognition
      if (userId !== requestingUserId && 
          !isOperationsDirector(currentUser) && 
          !hasAnyRole(currentUser, ['administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied" });
      }

      const recognitions = await storage.getUserRecognition(userId);
      res.json(recognitions);
    } catch (error) {
      console.error("Error fetching user recognition:", error);
      res.status(500).json({ message: "Failed to fetch recognition" });
    }
  });

  // Update recognition
  app.put('/api/recognition/:recognitionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { recognitionId } = req.params;
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      const updatedRecognition = await storage.updateRecognition(recognitionId, req.body);
      res.json(updatedRecognition);
    } catch (error) {
      console.error("Error updating recognition:", error);
      res.status(500).json({ message: "Failed to update recognition" });
    }
  });

  // Delete recognition
  app.delete('/api/recognition/:recognitionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { recognitionId } = req.params;
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      await storage.deleteRecognition(recognitionId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting recognition:", error);
      res.status(500).json({ message: "Failed to delete recognition" });
    }
  });

  // Work Order Filter routes (Module 12 - Resource Optimization Engine)
  app.post('/api/work-order-filters', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const filter = await storage.createWorkOrderFilter(req.body);
      res.json(filter);
    } catch (error) {
      console.error("Error creating work order filter:", error);
      res.status(500).json({ message: "Failed to create filter" });
    }
  });

  app.get('/api/work-order-filters/:workOrderId', isAuthenticated, async (req: any, res) => {
    try {
      const filter = await storage.getWorkOrderFilter(req.params.workOrderId);
      res.json(filter);
    } catch (error) {
      console.error("Error fetching work order filter:", error);
      res.status(500).json({ message: "Failed to fetch filter" });
    }
  });

  app.put('/api/work-order-filters/:workOrderId', isAuthenticated, async (req: any, res) => {
    try {
      const filter = await storage.updateWorkOrderFilter(req.params.workOrderId, req.body);
      res.json(filter);
    } catch (error) {
      console.error("Error updating work order filter:", error);
      res.status(500).json({ message: "Failed to update filter" });
    }
  });

  app.delete('/api/work-order-filters/:workOrderId', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteWorkOrderFilter(req.params.workOrderId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting work order filter:", error);
      res.status(500).json({ message: "Failed to delete filter" });
    }
  });

  // Enhanced Search routes (Module 12)
  app.post('/api/work-orders/search', isAuthenticated, async (req: any, res) => {
    try {
      const workOrders = await storage.searchWorkOrdersWithFilters(req.body);
      res.json(workOrders);
    } catch (error) {
      console.error("Error searching work orders:", error);
      res.status(500).json({ message: "Failed to search work orders" });
    }
  });

  // Agent Recommendation routes (Module 13 - Smart Routing & Dispatch)
  app.post('/api/agent-recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      const recommendation = await storage.createAgentRecommendation(req.body);
      res.json(recommendation);
    } catch (error) {
      console.error("Error creating agent recommendation:", error);
      res.status(500).json({ message: "Failed to create recommendation" });
    }
  });

  app.get('/api/agent-recommendations/:workOrderId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      const recommendations = await storage.getAgentRecommendations(req.params.workOrderId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching agent recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  app.post('/api/agent-recommendations/generate/:workOrderId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      const recommendations = await storage.generateRecommendationsForWorkOrder(req.params.workOrderId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating agent recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  app.put('/api/agent-recommendations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      const recommendation = await storage.updateAgentRecommendation(req.params.id, req.body);
      res.json(recommendation);
    } catch (error) {
      console.error("Error updating agent recommendation:", error);
      res.status(500).json({ message: "Failed to update recommendation" });
    }
  });

  app.delete('/api/agent-recommendations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      await storage.deleteAgentRecommendation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting agent recommendation:", error);
      res.status(500).json({ message: "Failed to delete recommendation" });
    }
  });

  // Agent Skills routes (Module 3 - Enhanced Agent Capabilities)
  app.post('/api/agent-skills', isAuthenticated, async (req: any, res) => {
    try {
      const skill = await storage.createAgentSkill(req.body);
      res.json(skill);
    } catch (error) {
      console.error("Error creating agent skill:", error);
      res.status(500).json({ message: "Failed to create skill" });
    }
  });

  app.get('/api/agent-skills/:agentId', isAuthenticated, async (req: any, res) => {
    try {
      const skills = await storage.getAgentSkills(req.params.agentId);
      res.json(skills);
    } catch (error) {
      console.error("Error fetching agent skills:", error);
      res.status(500).json({ message: "Failed to fetch skills" });
    }
  });

  app.put('/api/agent-skills/:id', isAuthenticated, async (req: any, res) => {
    try {
      const skill = await storage.updateAgentSkill(req.params.id, req.body);
      res.json(skill);
    } catch (error) {
      console.error("Error updating agent skill:", error);
      res.status(500).json({ message: "Failed to update skill" });
    }
  });

  app.put('/api/agent-skills/:id/verify', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin level access required." });
      }

      const skill = await storage.verifyAgentSkill(req.params.id, userId);
      res.json(skill);
    } catch (error) {
      console.error("Error verifying agent skill:", error);
      res.status(500).json({ message: "Failed to verify skill" });
    }
  });

  app.delete('/api/agent-skills/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteAgentSkill(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting agent skill:", error);
      res.status(500).json({ message: "Failed to delete skill" });
    }
  });

  // Agent Location routes (Module 3 - Enhanced Agent Capabilities)
  app.post('/api/agent-locations', isAuthenticated, async (req: any, res) => {
    try {
      const location = await storage.createAgentLocation(req.body);
      res.json(location);
    } catch (error) {
      console.error("Error creating agent location:", error);
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  app.get('/api/agent-locations/:agentId', isAuthenticated, async (req: any, res) => {
    try {
      const locations = await storage.getAgentLocations(req.params.agentId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching agent locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.get('/api/agent-locations/:agentId/primary', isAuthenticated, async (req: any, res) => {
    try {
      const location = await storage.getPrimaryAgentLocation(req.params.agentId);
      res.json(location);
    } catch (error) {
      console.error("Error fetching primary agent location:", error);
      res.status(500).json({ message: "Failed to fetch primary location" });
    }
  });

  app.put('/api/agent-locations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const location = await storage.updateAgentLocation(req.params.id, req.body);
      res.json(location);
    } catch (error) {
      console.error("Error updating agent location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.put('/api/agent-locations/:agentId/primary/:locationId', isAuthenticated, async (req: any, res) => {
    try {
      await storage.setPrimaryLocation(req.params.agentId, req.params.locationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting primary location:", error);
      res.status(500).json({ message: "Failed to set primary location" });
    }
  });

  app.delete('/api/agent-locations/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteAgentLocation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting agent location:", error);
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // ===== PROJECT HEARTBEAT MONITOR ROUTES =====

  // Get project heartbeat for a work order
  app.get('/api/project-heartbeat/:workOrderId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { workOrderId } = req.params;

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get the work order to check permissions
      const workOrder = await storage.getWorkOrder(workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Check if user can access this work order
      if (!isOperationsDirector(currentUser) && workOrder.companyId !== currentUser.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      let heartbeat = await storage.getProjectHeartbeat(workOrderId);
      
      // Create heartbeat if it doesn't exist
      if (!heartbeat) {
        heartbeat = await storage.createProjectHeartbeat({
          workOrderId,
          currentBpm: 70,
          healthScore: 100,
          projectStatus: 'healthy',
          monitoringEnabled: true,
          escalationCount: 0,
          failureThreshold: 180,
          baselineBpm: 70
        });
      }

      res.json(heartbeat);
    } catch (error) {
      console.error("Error fetching project heartbeat:", error);
      res.status(500).json({ message: "Failed to fetch project heartbeat" });
    }
  });

  // Get heartbeat events for a project
  app.get('/api/project-heartbeat/:heartbeatId/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { heartbeatId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get the heartbeat and associated work order to check permissions
      const heartbeat = await storage.getProjectHeartbeatById(heartbeatId);
      if (!heartbeat) {
        return res.status(404).json({ message: "Project heartbeat not found" });
      }

      const workOrder = await storage.getWorkOrder(heartbeat.workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Check if user can access this work order
      if (!isOperationsDirector(currentUser) && workOrder.companyId !== currentUser.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const events = await storage.getProjectHeartbeatEvents(heartbeatId, parseInt(limit as string), parseInt(offset as string));
      res.json(events);
    } catch (error) {
      console.error("Error fetching heartbeat events:", error);
      res.status(500).json({ message: "Failed to fetch heartbeat events" });
    }
  });

  // Trigger a heartbeat event
  app.post('/api/project-heartbeat/event', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { workOrderId, eventType, eventData, impact, notes } = req.body;

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get the work order to check permissions
      const workOrder = await storage.getWorkOrder(workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Check if user can access this work order
      if (!isOperationsDirector(currentUser) && workOrder.companyId !== currentUser.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get or create project heartbeat
      let heartbeat = await storage.getProjectHeartbeat(workOrderId);
      if (!heartbeat) {
        heartbeat = await storage.createProjectHeartbeat({
          workOrderId,
          currentBpm: 70,
          healthScore: 100,
          projectStatus: 'healthy',
          monitoringEnabled: true,
          escalationCount: 0,
          failureThreshold: 180,
          baselineBpm: 70
        });
      }

      // Calculate health score change based on event type
      let healthScoreChange = 0;
      const determinedImpact = impact || 'neutral';

      switch (eventType) {
        case 'issue_created':
          healthScoreChange = 10;
          break;
        case 'missed_checkin':
          healthScoreChange = 15;
          break;
        case 'unresolved_issue':
          healthScoreChange = 5;
          break;
        case 'denied_deliverable':
          healthScoreChange = 10;
          break;
        case 'over_budget':
          healthScoreChange = 10;
          break;
        case 'uncompleted_tasks':
          healthScoreChange = 5;
          break;
        case 'issue_resolved':
          healthScoreChange = -10;
          break;
        case 'check_in':
          healthScoreChange = -10;
          break;
        case 'approved_deliverable':
          healthScoreChange = -10;
          break;
        case 'tasks_completed':
          healthScoreChange = -5;
          break;
        default:
          healthScoreChange = 0;
      }

      // Reduce positive effects if multiple escalations are active
      if (healthScoreChange < 0 && heartbeat.escalationCount > 1) {
        healthScoreChange = Math.round(healthScoreChange * 0.5);
      }

      // Create heartbeat event
      const event = await storage.createProjectHeartbeatEvent({
        heartbeatId: heartbeat.id,
        eventType,
        eventData: eventData || {},
        impact: healthScoreChange > 0 ? 'negative' : healthScoreChange < 0 ? 'positive' : 'neutral',
        healthScoreChange,
        triggeredBy: userId,
        automaticEvent: false,
        notes
      });

      // Update heartbeat health score and BPM
      const newHealthScore = Math.max(0, Math.min(100, heartbeat.healthScore - healthScoreChange));
      const newBpm = Math.max(70, Math.min(180, 70 + ((100 - newHealthScore) * 1.1)));
      const newEscalationCount = healthScoreChange > 0 ? heartbeat.escalationCount + 1 : Math.max(0, heartbeat.escalationCount - 1);
      
      let projectFailed = false;
      let autoReviewTriggered = false;

      // Check for project failure
      if (newBpm >= 180) {
        projectFailed = true;
        autoReviewTriggered = true;
      }

      await storage.updateProjectHeartbeat(heartbeat.id, {
        currentBpm: Math.round(newBpm),
        healthScore: newHealthScore,
        projectStatus: newBpm >= 180 ? 'failed' : newBpm >= 171 ? 'critical' : newBpm >= 131 ? 'high_stress' : newBpm >= 91 ? 'elevated' : 'healthy',
        escalationCount: newEscalationCount,
        projectFailed,
        autoReviewTriggered,
        failedAt: projectFailed ? new Date() : undefined,
        lastActivity: new Date()
      });

      // Log heartbeat change to health log
      await storage.createProjectHealthLog({
        workOrderId,
        bpm: Math.round(newBpm),
        healthScore: newHealthScore,
        eventType,
        eventId: event.id,
        projectStatus: newBpm >= 180 ? 'failed' : newBpm >= 171 ? 'critical' : newBpm >= 131 ? 'high_stress' : newBpm >= 91 ? 'elevated' : 'healthy',
        escalationCount: newEscalationCount
      });

      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating heartbeat event:", error);
      res.status(500).json({ message: "Failed to create heartbeat event" });
    }
  });

  // Get project health summary for all projects
  app.get('/api/project-health-summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      let companyId = undefined;
      if (!isOperationsDirector(currentUser)) {
        companyId = currentUser.companyId;
      }

      const summary = await storage.getProjectHealthSummary(companyId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching project health summary:", error);
      res.status(500).json({ message: "Failed to fetch project health summary" });
    }
  });

  // Update heartbeat monitoring settings
  app.put('/api/project-heartbeat/:heartbeatId/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const { heartbeatId } = req.params;
      const { monitoringEnabled, failureThreshold, baselineBpm } = req.body;

      if (!currentUser || !hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager'])) {
        return res.status(403).json({ message: "Access denied. Admin access required." });
      }

      // Get the heartbeat and associated work order to check permissions
      const heartbeat = await storage.getProjectHeartbeatById(heartbeatId);
      if (!heartbeat) {
        return res.status(404).json({ message: "Project heartbeat not found" });
      }

      const workOrder = await storage.getWorkOrder(heartbeat.workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Check if user can access this work order
      if (!isOperationsDirector(currentUser) && workOrder.companyId !== currentUser.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates: any = {};
      if (typeof monitoringEnabled === 'boolean') updates.monitoringEnabled = monitoringEnabled;
      if (failureThreshold) updates.failureThreshold = failureThreshold;
      if (baselineBpm) updates.baselineBpm = baselineBpm;

      const updatedHeartbeat = await storage.updateProjectHeartbeat(heartbeatId, updates);
      res.json(updatedHeartbeat);
    } catch (error) {
      console.error("Error updating heartbeat settings:", error);
      res.status(500).json({ message: "Failed to update heartbeat settings" });
    }
  });

  // Document management API routes
  
  // Get upload URL for documents
  app.post('/api/documents/upload', isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Create document record
  app.post('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const validatedData = insertDocumentSchema.parse({
        ...req.body,
        uploadedById: userId,
      });

      // Validate entity access based on entityType
      if (validatedData.entityType === 'work_order') {
        const workOrder = await storage.getWorkOrder(validatedData.entityId);
        if (!workOrder) {
          return res.status(404).json({ message: "Work order not found" });
        }
        // Check if user can access this work order
        if (!isOperationsDirector(currentUser) && 
            workOrder.companyId !== currentUser.companyId &&
            workOrder.assigneeId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (validatedData.entityType === 'project') {
        const project = await storage.getProject(validatedData.entityId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        // Check if user can access this project
        if (!isOperationsDirector(currentUser) && 
            project.companyId !== currentUser.companyId) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (validatedData.entityType === 'task') {
        const task = await storage.getWorkOrderTask(validatedData.entityId);
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }
        // Get associated work order for access check
        const workOrder = await storage.getWorkOrder(task.workOrderId);
        if (!workOrder) {
          return res.status(404).json({ message: "Associated work order not found" });
        }
        if (!isOperationsDirector(currentUser) && 
            workOrder.companyId !== currentUser.companyId &&
            workOrder.assigneeId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Set ACL policy for the uploaded file
      const objectStorageService = new ObjectStorageService();
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(
        validatedData.fileUrl,
        {
          owner: userId,
          visibility: "private", // Documents are private by default
        }
      );

      // Update the file URL with normalized path
      validatedData.fileUrl = normalizedPath;

      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  // Get documents for an entity
  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const { entityType, entityId } = req.query;
      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId are required" });
      }

      // Validate entity access
      if (entityType === 'work_order') {
        const workOrder = await storage.getWorkOrder(entityId);
        if (!workOrder) {
          return res.status(404).json({ message: "Work order not found" });
        }
        if (!isOperationsDirector(currentUser) && 
            workOrder.companyId !== currentUser.companyId &&
            workOrder.assigneeId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (entityType === 'project') {
        const project = await storage.getProject(entityId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        if (!isOperationsDirector(currentUser) && 
            project.companyId !== currentUser.companyId) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (entityType === 'task') {
        const task = await storage.getWorkOrderTask(entityId);
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }
        const workOrder = await storage.getWorkOrder(task.workOrderId);
        if (!workOrder) {
          return res.status(404).json({ message: "Associated work order not found" });
        }
        if (!isOperationsDirector(currentUser) && 
            workOrder.companyId !== currentUser.companyId &&
            workOrder.assigneeId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const documents = await storage.getDocuments(entityType, entityId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Serve document files (with access control)
  app.get('/objects/:objectPath(*)', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const objectStorageService = new ObjectStorageService();
      
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.sendStatus(403);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving document:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Delete document
  app.delete('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const documentId = req.params.id;
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check if user can delete this document
      const isOwner = document.uploadedById === userId;
      const isAdmin = hasAnyRole(currentUser, ['operations_director', 'administrator', 'manager']);
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Access denied. Only document owner or admin can delete." });
      }

      // Validate entity access
      if (document.entityType === 'work_order') {
        const workOrder = await storage.getWorkOrder(document.entityId);
        if (workOrder && !isOperationsDirector(currentUser) && 
            workOrder.companyId !== currentUser.companyId) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (document.entityType === 'project') {
        const project = await storage.getProject(document.entityId);
        if (project && !isOperationsDirector(currentUser) && 
            project.companyId !== currentUser.companyId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      await storage.deleteDocument(documentId);
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Document upload management routes
  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const entityType = req.query.entityType;
      const entityId = req.query.entityId;
      
      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId are required" });
      }
      
      // Check permissions based on entity type
      if (entityType === 'work_order') {
        const workOrder = await storage.getWorkOrder(entityId);
        if (!workOrder) {
          return res.status(404).json({ message: "Work order not found" });
        }
        if (!isOperationsDirector(currentUser) && workOrder.companyId !== currentUser.companyId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      // Return simulated document list for now
      // In real implementation, this would query a documents table
      const documents = [];
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post('/api/documents/upload', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Only Service Company users can upload documents
      if (isClient(currentUser)) {
        return res.status(403).json({ message: "Client Company users cannot upload documents" });
      }

      const { entityType, entityId, category } = req.body;
      
      if (!entityType || !entityId || !category) {
        return res.status(400).json({ message: "entityType, entityId, and category are required" });
      }

      // Check if documents are required for this entity
      let documentsRequired = 0;
      if (entityType === 'work_order') {
        const workOrder = await storage.getWorkOrder(entityId);
        if (!workOrder) {
          return res.status(404).json({ message: "Work order not found" });
        }
        documentsRequired = workOrder.documentsRequired || 0;
        
        // Check permissions
        if (!isOperationsDirector(currentUser) && workOrder.companyId !== currentUser.companyId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      if (documentsRequired === 0) {
        return res.status(400).json({ message: "No documents are required for this work order" });
      }

      // For now, simulate document upload
      // In real implementation, handle actual file upload with multer/formidable
      const document = {
        id: Math.random().toString(36).substr(2, 9),
        entityType,
        entityId,
        category,
        filename: `document_${Date.now()}.pdf`,
        originalFilename: "uploaded_document.pdf",
        uploadedAt: new Date().toISOString(),
        uploadedById: currentUser.id,
      };

      res.json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}



