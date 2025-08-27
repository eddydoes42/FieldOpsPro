import { storage } from "./storage";
import type { InsertAuditLog } from "@shared/schema";

/**
 * Audit Logger Utility
 * 
 * This utility provides a centralized way to log key actions across the application
 * for operational transparency and accountability.
 */

export interface AuditLogConfig {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  metadata?: any;
}

/**
 * Log an audit entry for system actions
 */
export async function logAuditEvent(config: AuditLogConfig): Promise<void> {
  try {
    const auditLog: InsertAuditLog = {
      entityType: config.entityType,
      entityId: config.entityId,
      action: config.action,
      performedBy: config.performedBy,
      previousState: config.previousState ? JSON.stringify(config.previousState) : null,
      newState: config.newState ? JSON.stringify(config.newState) : null,
      reason: config.reason || null,
      metadata: config.metadata ? JSON.stringify(config.metadata) : null,
    };

    await storage.createAuditLog(auditLog);
  } catch (error) {
    // Log audit failures to console but don't break the main flow
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Log work order actions
 */
export async function logWorkOrderAction(
  workOrderId: string,
  action: string,
  performedBy: string,
  previousState?: any,
  newState?: any,
  reason?: string
): Promise<void> {
  return logAuditEvent({
    entityType: "work_order",
    entityId: workOrderId,
    action,
    performedBy,
    previousState,
    newState,
    reason,
  });
}

/**
 * Log issue actions
 */
export async function logIssueAction(
  issueId: string,
  action: string,
  performedBy: string,
  previousState?: any,
  newState?: any,
  reason?: string
): Promise<void> {
  return logAuditEvent({
    entityType: "issue",
    entityId: issueId,
    action,
    performedBy,
    previousState,
    newState,
    reason,
  });
}

/**
 * Log user actions (not related to specific entities)
 */
export async function logUserAction(
  action: string,
  performedBy: string,
  metadata?: any,
  reason?: string
): Promise<void> {
  return logAuditEvent({
    entityType: "user_action",
    entityId: performedBy, // Use user ID as entity ID for user actions
    action,
    performedBy,
    metadata,
    reason,
  });
}

/**
 * Log approval actions
 */
export async function logApprovalAction(
  approvalId: string,
  action: string,
  performedBy: string,
  previousState?: any,
  newState?: any,
  reason?: string
): Promise<void> {
  return logAuditEvent({
    entityType: "approval",
    entityId: approvalId,
    action,
    performedBy,
    previousState,
    newState,
    reason,
  });
}

/**
 * Log assignment actions
 */
export async function logAssignmentAction(
  workOrderId: string,
  action: string,
  performedBy: string,
  previousAssignee?: string,
  newAssignee?: string,
  reason?: string
): Promise<void> {
  return logAuditEvent({
    entityType: "assignment",
    entityId: workOrderId,
    action,
    performedBy,
    previousState: previousAssignee ? { assignee: previousAssignee } : undefined,
    newState: newAssignee ? { assignee: newAssignee } : undefined,
    reason,
  });
}

// Common audit actions
export const AUDIT_ACTIONS = {
  CREATED: "created",
  UPDATED: "updated",
  DELETED: "deleted",
  ASSIGNED: "assigned",
  UNASSIGNED: "unassigned",
  APPROVED: "approved",
  REJECTED: "rejected",
  RESOLVED: "resolved",
  ESCALATED: "escalated",
  SCHEDULED: "scheduled",
  STARTED: "started",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  RESTORED: "restored",
} as const;

// Common entity types
export const ENTITY_TYPES = {
  WORK_ORDER: "work_order",
  ISSUE: "issue",
  USER_ACTION: "user_action",
  APPROVAL: "approval",
  ASSIGNMENT: "assignment",
  PROJECT: "project",
} as const;