# FieldOps Pro - IT Field Agent Management System

## Overview
FieldOps Pro is a comprehensive field operations management platform designed to streamline IT field services. It provides advanced operational tools, dynamic time tracking, and enhanced work order capabilities for mobile workforce teams. The system aims to improve communication, enhance operational efficiency, and support IT field service companies and their clients. Key capabilities include work order management with integrated issue reporting, user management, real-time messaging, resource optimization, smart routing, agent capabilities, profitability analysis, bidding, credential management, predictive risk, and service quality monitoring.

## User Preferences
Preferred communication style: Simple, everyday language.
Terminology preference: Organizations providing IT services should be referred to as "Service Companies" (not just "Companies"). Organizations providing work orders and projects to Service Companies should be referred to as "Client Companies" (not just "Companies").

## System Architecture

### UI/UX Design
The application features a modern design built on Tailwind CSS and shadcn/ui, providing a responsive interface with a consistent dark theme using a blue-grey color scheme. It emphasizes role-specific workflows with distinct dashboard layouts, a comprehensive calendar system with weekly view, advanced filtering, and icon-based navigation.

### Technical Implementation
The frontend is built with React and TypeScript, utilizing a component-based architecture with shadcn/ui for UI consistency and Tailwind CSS for styling. wouter is used for routing and TanStack Query for server state management. Form state is managed with React Hook Form and Zod for validation.
The backend uses Express.js with TypeScript, following a RESTful API design. It includes modules for authentication, data operations, and route handling, implementing role-based access control and comprehensive error handling. PostgreSQL is the primary database, with Drizzle ORM for type-safe operations.

### Feature Specifications
The system incorporates a hierarchical, role-based access control system including Operations Director, company-level administrators, managers, dispatchers, and field agents. Authentication uses Replit's OAuth with session management. The system supports distinct entity types for "Service Companies" (IT service providers) and "Client Companies" (IT service requirers).

**Core Features:**
- **Hierarchical Role System**: Strict access controls with Operations Director (god mode), Administrator, Manager, Dispatcher, Field Engineer, and Field Agent roles.
- **Work Order Management**: Creation, assignment, status tracking, task dependencies, integrated issue reporting, and budget management. Includes a dedicated `/mywork` page for agents.
- **User Management Hierarchy**: Defined CRUD permissions based on role hierarchy for both Service and Client companies.
- **Client Management System**: Dedicated client dashboard for work order creation, job network access, and field agent/engineer request and assignment.
- **Performance Analytics & Feedback**: Agent performance tracking, bidirectional star rating, structured client feedback loops (multi-tier rating, analytics, automated collection), and trend analysis.
- **Job Network**: A shared platform where eligible Service Company and Client Company roles can view, request, and manage work orders (Public for Client Company posts, Internal for Service Company posts). Supports "Request Assignment" and "Counter Proposal" options.
- **Talent Network**: Accessible to Client Companies for viewing and assigning Service Company personnel.
- **Enhanced Job Visibility**: Advanced filtering with location radius, skills matching, experience level, and exclusive network support with skill match scoring.
- **Document Management**: Comprehensive uploading, categorization (pre/during/post-visit), role-based access, and object storage integration.
- **Structured Issue Reporting**: Advanced creation system with categorization, severity levels, auto-escalation, analytics, and comprehensive tracking.
- **Advanced Operational Modules**: Job Category Profitability Analysis, Bid & Proposal System, Credential & Compliance Vault, Resource Optimization Engine, Smart Routing & Dispatch.
- **Predictive Risk & Service Quality**: Modules for predictive risk analysis and a service quality dashboard.
- **Restricted Authentication**: Login limited to pre-approved team members; no self-registration.

## Role-Based Access Control System

### Company Type Distinction

**Service Companies** (IT Service Providers):
- Complete operational hierarchy including field personnel
- 6 available roles: administrator, project_manager, manager, dispatcher, field_engineer, field_agent
- Manage teams, execute fieldwork, and deliver IT services

**Client Companies** (IT Service Requesters):
- Management and coordination roles only
- 4 available roles: administrator, project_manager, manager, dispatcher
- **NO field execution roles** - they hire Service Companies for fieldwork
- Focus on service requests, vendor management, and project oversight

### Role Hierarchy & Permissions

#### **1. Operations Director (Level 1000)**
- **Scope**: Global system oversight across all companies
- **Permissions**: Complete bypass (`resource: '*', action: '*'`)
- **Special Capabilities**:
  - Omnipresent role simulation (can test any role instantly)
  - Company creation and management
  - Global analytics and reporting
  - System configuration access
- **Dashboard Components**: Platform statistics, system health monitoring, budget analytics, service fee summary, company setups, access/approval requests, role simulation controls
- **Navigation**: Operations Dashboard, Companies, Administrators, Recent Setups, Job Network, Talent Network, Project Network, Exclusive Networks, Messages

#### **2. Administrator (Level 900)**
**Unified Role**: Context-aware permissions based on company type

**Service Company Administrator:**
- **Permissions**: users(*), workOrders(*), companies(read/update), jobNetwork(*), issues(*), messaging(*), reports(*), analytics(*)
- **Responsibilities**: Team management, service delivery, resource allocation, performance analytics
- **Dashboard Components**: Company performance overview, team management dashboard, work order statistics, job network activity, revenue analytics, client feedback summary, team performance metrics
- **Navigation**: Dashboard, Team, Job Network, Project Network, Work Orders, Job Requests, Calendar, Reports, Team Member Information, Messages

**Client Company Administrator:**
- **Permissions**: workOrders(create), workOrders(read+own_company), jobNetwork(read), fieldAgents(read), serviceCompanies(read)
- **Responsibilities**: Service procurement, vendor management, work order creation, budget oversight
- **Dashboard Components**: Active work orders (own company), service company directory, available field agents/engineers, job network browse, work order creation tools, service request management
- **Navigation**: Dashboard, Work Orders, Job Network, Talent Network, Messages

#### **3. Project Manager (Level 850)**
- **Available for**: Both Service and Client companies
- **Permissions**: users(read/update), workOrders(*), companies(read), jobNetwork(*), issues(*), messaging(*), reports(*), analytics(read)
- **Responsibilities**: Project portfolio management, resource planning, timeline coordination, risk assessment
- **Dashboard Components**: Project portfolio overview, resource planning tools, timeline & milestone tracking, team coordination hub, budget management dashboard, risk assessment tools
- **Navigation**: Dashboard, Project Network, Job Network, Talent Network, Exclusive Network, Messages

#### **4. Manager (Level 800)**
- **Available for**: Both Service and Client companies
- **Permissions**: users(read/update), workOrders(*), jobNetwork(*), issues(*), messaging(*), reports(read)
- **Responsibilities**: Team leadership, work order management, resource optimization, performance monitoring
- **Dashboard Components**: Team performance dashboard, work order assignment hub, resource optimization, issue resolution tracking, job network management, communication hub
- **Navigation**: Dashboard, Team, Job Network, Work Orders, Calendar, Messages

#### **5. Dispatcher (Level 700)**
- **Available for**: Both Service and Client companies
- **Permissions**: users(read), workOrders(*), jobNetwork(read), issues(read/update), messaging(*)
- **Responsibilities**: Work order coordination, resource allocation, scheduling, communication facilitation
- **Dashboard Components**: Work order dispatch board, agent availability matrix, job queue management, assignment optimization, communication center, route planning tools
- **Navigation**: Dashboard, Job Network, Work Orders, Job Requests, Calendar, Messages

#### **6. Field Engineer (Level 600)**
- **Available for**: Service Companies ONLY
- **Permissions**: workOrders(read/update), users(read), fieldAgents(promote), messaging(*), documents(*)
- **Responsibilities**: Technical leadership, field agent supervision, complex problem resolution, promotion recommendations
- **Dashboard Components**: Assigned work orders, field agent team management, technical documentation hub, performance tools, promotion recommendations, skills development tracker
- **Navigation**: Dashboard, My Work, My Team, Calendar, Messages

#### **7. Field Agent (Level 500)**
- **Available for**: Service Companies ONLY
- **Permissions**: workOrders(read/update+assigned_to_user), messaging(read/create), documents(read/upload), profile(update+own_profile)
- **Responsibilities**: Individual work order execution, documentation, time tracking, skill development
- **Dashboard Components**: My active work orders, today's schedule, time tracking tools, document upload center, message center, profile management, skills & certifications
- **Navigation**: My Work, Time, My Team, Settings

### Role Simulation System

**Operations Director Exclusive Feature:**
- Omnipresent role simulation interface (sticky header on all pages)
- Instant role switching without page reloads
- Separate dropdowns for Service Company and Client Company role testing
- Service Company roles: administrator, project_manager, manager, dispatcher, field_engineer, field_agent
- Client Company roles: administrator, project_manager, manager, dispatcher (NO field roles)
- "Stop Testing" button to return to Operations Director view
- Context-aware dashboard rendering based on simulated role and company type

**Implementation Details:**
- Role testing state stored in localStorage (`testingRole`, `testingCompanyType`)
- Navigation dynamically adjusts based on simulated role
- Unified administrator role correctly shows Service or Client company interface based on company type context
- Role simulation preserves company context for proper permission evaluation

### Permission Conditions & Contexts

**Conditional Permissions:**
- `assigned_to_user`: User can only access resources assigned to them
- `own_company`: User can only access resources within their company
- `own_profile`: User can only modify their own profile
- `client_company`: Special permissions for client company administrators

**Company Type Context:**
- Service companies: Full operational capabilities, team management, field execution, advanced analytics
- Client companies: Work order creation, service provider selection, vendor management, basic reporting
- Administrator role automatically adapts permissions and UI based on company type

### Database Schema Integration

**Role Validation:**
```typescript
// Allowed roles per company type (shared/schema.ts)
allowedRolesByCompanyType = {
  service: ['administrator', 'project_manager', 'manager', 'dispatcher', 'field_engineer', 'field_agent'],
  client: ['administrator', 'project_manager', 'manager', 'dispatcher'] // NO field roles
}
```

**RBAC Service:**
- 7 role definitions with hierarchical levels (1000-500)
- Permission-based access control with resource/action patterns
- Context-aware permission evaluation with company type consideration
- Caching and performance optimization for permission checks

**Key Design Principles:**
- Service Companies execute work; Client Companies request work
- Field roles (engineer/agent) exclusive to Service Companies
- Unified administrator role adapts based on company context
- Operations Director can simulate any valid role for testing

## External Dependencies
- **React**: Frontend UI library.
- **TypeScript**: Programming language.
- **Express.js**: Backend web application framework.
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: ORM for PostgreSQL.
- **shadcn/ui**: UI component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **wouter**: React router.
- **TanStack Query**: Data fetching and state management library.
- **Replit's OAuth**: Authentication provider.
- **connect-pg-simple**: PostgreSQL session store.
- **React Hook Form**: Form management library.
- **Zod**: Schema validation library.