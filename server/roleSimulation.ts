import { storage } from "./storage";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { users, companies } from "../shared/schema";

// Maps role names to test user roles for role simulation
const ROLE_SIMULATION_MAP = {
  service: {
    administrator: { firstName: "TestAdmin", lastName: "Service" },
    project_manager: { firstName: "TestProj", lastName: "Service" },
    manager: { firstName: "TestMan", lastName: "Service" },
    field_engineer: { firstName: "TestEng", lastName: "Service" },
    field_agent: { firstName: "TestAge", lastName: "Service" }
  },
  client: {
    administrator: { firstName: "TestAdmin", lastName: "Client" },
    project_manager: { firstName: "TestProj", lastName: "Client" },
    manager: { firstName: "TestMan", lastName: "Client" },
    dispatcher: { firstName: "TestDisp", lastName: "Client" }
  }
};

export interface RoleSimulationContext {
  originalUserId: string;
  simulatedUserId: string;
  simulatedUser: any;
  companyType: 'service' | 'client';
  role: string;
  startTime: Date;
  redirectUrl?: string;
}

// In-memory store for active role simulations (in production, use Redis or database)
const activeRoleSimulations = new Map<string, RoleSimulationContext>();

export class RoleSimulationService {
  
  /**
   * Start role simulation for Operations Director
   */
  async startRoleSimulation(
    originalUserId: string, 
    role: string, 
    companyType: 'service' | 'client'
  ): Promise<RoleSimulationContext> {
    
    // Verify original user is Operations Director
    const originalUser = await storage.getUser(originalUserId);
    if (!originalUser || !originalUser.roles?.includes('operations_director')) {
      throw new Error('Only Operations Directors can use role simulation');
    }

    // Get the test company of the specified type
    const [testCompany] = await db.select()
      .from(companies)
      .where(and(
        eq(companies.type, companyType),
        eq(companies.name, companyType === 'service' ? 'Test Service Company' : 'Test Client Company')
      ));

    if (!testCompany) {
      throw new Error(`Test ${companyType} company not found. Please run database seeding first.`);
    }

    // Find the role simulation target based on role and company type
    const roleMapping = ROLE_SIMULATION_MAP[companyType];
    const simulationTarget = roleMapping && typeof roleMapping === 'object' && role in roleMapping 
      ? (roleMapping as any)[role] 
      : null;
    
    if (!simulationTarget) {
      throw new Error(`No role simulation target found for role: ${role} in ${companyType} company`);
    }

    // Find the test user for role simulation
    const [testUser] = await db.select()
      .from(users)
      .where(and(
        eq(users.firstName, simulationTarget.firstName),
        eq(users.lastName, simulationTarget.lastName),
        eq(users.companyId, testCompany.id)
      ));

    if (!testUser) {
      throw new Error(`Test user not found: ${simulationTarget.firstName} ${simulationTarget.lastName}. Please run database seeding first.`);
    }

    // Calculate appropriate redirect URL based on role
    const getRedirectUrl = (role: string): string => {
      const roleMapping: Record<string, string> = {
        'administrator': '/admin-dashboard',
        'project_manager': '/project-manager-dashboard', 
        'manager': '/manager-dashboard',
        'dispatcher': '/dispatcher-dashboard',
        'field_engineer': '/mywork',
        'field_agent': '/mywork',
        'client_company_admin': '/dashboard'
      };
      return roleMapping[role] || '/dashboard';
    };

    // Create role simulation context
    const roleSimulationContext: RoleSimulationContext = {
      originalUserId,
      simulatedUserId: testUser.id,
      simulatedUser: testUser,
      companyType,
      role,
      startTime: new Date(),
      redirectUrl: getRedirectUrl(role)
    };

    // Store active role simulation
    activeRoleSimulations.set(originalUserId, roleSimulationContext);

    console.log(`Role simulation started: OD ${originalUserId} -> ${testUser.firstName} ${testUser.lastName} (${role}) in ${companyType} company`);

    return roleSimulationContext;
  }

  /**
   * Stop role simulation and return to original user
   */
  async stopRoleSimulation(originalUserId: string): Promise<void> {
    const simulation = activeRoleSimulations.get(originalUserId);
    if (simulation) {
      activeRoleSimulations.delete(originalUserId);
      console.log(`Role simulation stopped for OD ${originalUserId}`);
    }
  }

  /**
   * Get active role simulation context for a user
   */
  getRoleSimulationContext(userId: string): RoleSimulationContext | null {
    return activeRoleSimulations.get(userId) || null;
  }

  /**
   * Get the effective user for API operations (returns simulated user if active)
   */
  async getEffectiveUser(originalUserId: string): Promise<any> {
    const simulation = this.getRoleSimulationContext(originalUserId);
    
    if (simulation) {
      // Return the simulated user for role testing
      return simulation.simulatedUser;
    }
    
    // Return the original user
    return await storage.getUser(originalUserId);
  }

  /**
   * Check if a user is currently simulating another role
   */
  isSimulatingRole(userId: string): boolean {
    return activeRoleSimulations.has(userId);
  }

  /**
   * Get all active role simulations (for monitoring/debugging)
   */
  getAllActiveRoleSimulations(): RoleSimulationContext[] {
    return Array.from(activeRoleSimulations.values());
  }
}

export const roleSimulationService = new RoleSimulationService();