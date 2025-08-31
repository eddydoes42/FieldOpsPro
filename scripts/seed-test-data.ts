import { db } from "../server/db";
import { companies, users, insertCompanySchema, insertUserSchema } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function seedTestData() {
  console.log("Starting test data seeding...");

  try {
    // Check if test companies already exist
    const existingServiceCompany = await db.select().from(companies).where(eq(companies.name, "Test Service Company"));
    const existingClientCompany = await db.select().from(companies).where(eq(companies.name, "Test Client Company"));

    let serviceCompanyId: number;
    let clientCompanyId: number;

    // Create Service Company if it doesn't exist
    if (existingServiceCompany.length === 0) {
      const [serviceCompany] = await db.insert(companies).values({
        name: "Test Service Company",
        type: "service",
        isActive: true
      }).returning();
      serviceCompanyId = serviceCompany.id;
      console.log(`Created Service Company with ID: ${serviceCompanyId}`);
    } else {
      serviceCompanyId = existingServiceCompany[0].id;
      console.log(`Service Company already exists with ID: ${serviceCompanyId}`);
    }

    // Create Client Company if it doesn't exist
    if (existingClientCompany.length === 0) {
      const [clientCompany] = await db.insert(companies).values({
        name: "Test Client Company",
        type: "client",
        isActive: true
      }).returning();
      clientCompanyId = clientCompany.id;
      console.log(`Created Client Company with ID: ${clientCompanyId}`);
    } else {
      clientCompanyId = existingClientCompany[0].id;
      console.log(`Client Company already exists with ID: ${clientCompanyId}`);
    }

    // Hash password for all test users
    const hashedPassword = await bcrypt.hash("TestPass123!", 10);

    // Service Company Users
    const serviceUsers = [
      {
        firstName: "TestAdmin",
        lastName: "Service",
        email: "testadmin.service@test.com",
        password: hashedPassword,
        roles: ["administrator"],
        companyId: serviceCompanyId,
        status: "active"
      },
      {
        firstName: "TestProj",
        lastName: "Service",
        email: "testproj.service@test.com",
        password: hashedPassword,
        roles: ["project_manager"],
        companyId: serviceCompanyId,
        status: "active"
      },
      {
        firstName: "TestMan",
        lastName: "Service",
        email: "testman.service@test.com",
        password: hashedPassword,
        roles: ["manager"],
        companyId: serviceCompanyId,
        status: "active"
      },
      {
        firstName: "TestEng",
        lastName: "Service",
        email: "testeng.service@test.com",
        password: hashedPassword,
        roles: ["field_engineer"],
        companyId: serviceCompanyId,
        status: "active"
      },
      {
        firstName: "TestAge",
        lastName: "Service",
        email: "testage.service@test.com",
        password: hashedPassword,
        roles: ["field_agent"],
        companyId: serviceCompanyId,
        status: "active"
      }
    ];

    // Client Company Users
    const clientUsers = [
      {
        firstName: "Test Admin",
        lastName: "Client",
        email: "testadmin.client@test.com",
        password: hashedPassword,
        roles: ["administrator"],
        companyId: clientCompanyId,
        status: "active"
      },
      {
        firstName: "TestProj",
        lastName: "Client",
        email: "testproj.client@test.com",
        password: hashedPassword,
        roles: ["project_manager"],
        companyId: clientCompanyId,
        status: "active"
      },
      {
        firstName: "TestMan",
        lastName: "Client",
        email: "testman.client@test.com",
        password: hashedPassword,
        roles: ["manager"],
        companyId: clientCompanyId,
        status: "active"
      }
    ];

    // Insert Service Company users
    for (const userData of serviceUsers) {
      const existingUser = await db.select().from(users).where(eq(users.email, userData.email));
      if (existingUser.length === 0) {
        const [user] = await db.insert(users).values(userData).returning();
        console.log(`Created Service Company user: ${userData.firstName} ${userData.lastName} (${userData.roles[0]}) with ID: ${user.id}`);
      } else {
        console.log(`Service Company user already exists: ${userData.firstName} ${userData.lastName} (${userData.roles[0]})`);
      }
    }

    // Insert Client Company users
    for (const userData of clientUsers) {
      const existingUser = await db.select().from(users).where(eq(users.email, userData.email));
      if (existingUser.length === 0) {
        const [user] = await db.insert(users).values(userData).returning();
        console.log(`Created Client Company user: ${userData.firstName} ${userData.lastName} (${userData.roles[0]}) with ID: ${user.id}`);
      } else {
        console.log(`Client Company user already exists: ${userData.firstName} ${userData.lastName} (${userData.roles[0]})`);
      }
    }

    console.log("Test data seeding completed successfully!");

  } catch (error) {
    console.error("Error seeding test data:", error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestData()
    .then(() => {
      console.log("Seeding process finished.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

export { seedTestData };