import { storage } from "./storage";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { users, companies } from "../shared/schema";

// Maps role names to test user roles for impersonation
const ROLE_IMPERSONATION_MAP = {
  service: {
    administrator: { firstName: "TestAdmin", lastName: "Service" },
    project_manager: { firstName: "TestProj", lastName: "Service" },
    manager: { firstName: "TestMan", lastName: "Service" },
    field_engineer: { firstName: "TestEng", lastName: "Service" },
    field_agent: { firstName: "TestAge", lastName: "Service" }
  },
  client: {
    client_company_admin: { firstName: "TestAdmin", lastName: "Client" },
    project_manager: { firstName: "TestProj", lastName: "Client" },
    manager: { firstName: "TestMan", lastName: "Client" }
  }
};

export interface ImpersonationContext {
  originalUserId: string;
  impersonatedUserId: string;
  impersonatedUser: any;
  companyType: 'service' | 'client';
  role: string;
  startTime: Date;
}

// In-memory store for active impersonations (in production, use Redis or database)
const activeImpersonations = new Map<string, ImpersonationContext>();

export class RoleImpersonationService {
  
  /**
   * Start role impersonation for Operations Director
   */
  async startImpersonation(
    originalUserId: string, 
    role: string, 
    companyType: 'service' | 'client'
  ): Promise<ImpersonationContext> {
    
    // Verify original user is Operations Director
    const originalUser = await storage.getUser(originalUserId);
    if (!originalUser || !originalUser.roles?.includes('operations_director')) {
      throw new Error('Only Operations Directors can use role impersonation');
    }

    // Get the test company of the specified type
    const [testCompany] = await db.select()
      .from(companies)
      .where(and(
        eq(companies.companyType, companyType),
        eq(companies.name, companyType === 'service' ? 'Test Service Company' : 'Test Client Company')
      ));

    if (!testCompany) {
      throw new Error(`Test ${companyType} company not found. Please run database seeding first.`);
    }

    // Find the impersonation target based on role and company type
    const impersonationTarget = ROLE_IMPERSONATION_MAP[companyType][role as keyof typeof ROLE_IMPERSONATION_MAP['service']];
    if (!impersonationTarget) {
      throw new Error(`No impersonation target found for role: ${role} in ${companyType} company`);
    }

    // Find the test user to impersonate
    const [testUser] = await db.select()
      .from(users)
      .where(and(
        eq(users.firstName, impersonationTarget.firstName),
        eq(users.lastName, impersonationTarget.lastName),
        eq(users.companyId, testCompany.id)
      ));

    if (!testUser) {
      throw new Error(`Test user not found: ${impersonationTarget.firstName} ${impersonationTarget.lastName}. Please run database seeding first.`);
    }

    // Create impersonation context
    const impersonationContext: ImpersonationContext = {
      originalUserId,
      impersonatedUserId: testUser.id,
      impersonatedUser: testUser,
      companyType,
      role,
      startTime: new Date()
    };

    // Store active impersonation
    activeImpersonations.set(originalUserId, impersonationContext);

    console.log(`Role impersonation started: OD ${originalUserId} -> ${testUser.firstName} ${testUser.lastName} (${role}) in ${companyType} company`);

    return impersonationContext;
  }

  /**
   * Stop role impersonation and return to original user
   */
  async stopImpersonation(originalUserId: string): Promise<void> {
    const impersonation = activeImpersonations.get(originalUserId);
    if (impersonation) {
      activeImpersonations.delete(originalUserId);
      console.log(`Role impersonation stopped for OD ${originalUserId}`);
    }
  }

  /**
   * Get active impersonation context for a user
   */
  getImpersonationContext(userId: string): ImpersonationContext | null {
    return activeImpersonations.get(userId) || null;
  }

  /**
   * Get the effective user for API operations (returns impersonated user if active)
   */
  async getEffectiveUser(originalUserId: string): Promise<any> {
    const impersonation = this.getImpersonationContext(originalUserId);
    
    if (impersonation) {
      // Return the impersonated user for role testing
      return impersonation.impersonatedUser;
    }
    
    // Return the original user
    return await storage.getUser(originalUserId);
  }

  /**
   * Check if a user is currently impersonating another role
   */
  isImpersonating(userId: string): boolean {
    return activeImpersonations.has(userId);
  }

  /**
   * Get all active impersonations (for monitoring/debugging)
   */
  getAllActiveImpersonations(): ImpersonationContext[] {
    return Array.from(activeImpersonations.values());
  }
}

export const roleImpersonationService = new RoleImpersonationService();