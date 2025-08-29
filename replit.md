# FieldOps Pro - IT Field Agent Management System

## Overview
FieldOps Pro is a comprehensive field operations management platform that empowers mobile workforce teams with advanced operational tools, dynamic time tracking, and enhanced work order capabilities. It features a hierarchical role-based system with Operations Director (god mode capabilities), company-level administrators, managers, dispatchers, and field agents. The system includes comprehensive work order management with integrated issue reporting, streamlined role testing capabilities, user management workflows, and real-time messaging. The application aims to streamline IT field services, improve communication, and enhance operational efficiency through strict role-based access controls and company hierarchy management.

## Recent Changes
- **January 27, 2025**: Completed Predictive Risk & Early Intervention module with comprehensive backend infrastructure - added risk_scores and risk_interventions tables, storage methods for trend analysis and risk scoring (agent and company performance tracking, flagged metrics detection, intervention workflow management), and API routes with proper role-based access controls for proactive risk management
- **January 27, 2025**: Completed Service Quality Dashboard module with comprehensive backend infrastructure - added service_quality_snapshots table, storage methods for aggregating company-level metrics (job completion rates, client satisfaction scores, compliance metrics, operational efficiency), and API routes with proper role-based access controls for service quality insights
- **January 27, 2025**: Completed Agent Performance Analytics module with comprehensive backend infrastructure - added performance snapshots table, storage methods for aggregating operational data (job completion stats, feedback ratings, issue history, audit compliance), and API routes with proper role-based access controls
- **January 27, 2025**: Fully implemented Client Feedback Loop system with structured feedback collection - added feedback table with star ratings, category scores, comments, and "would hire again" tracking, complete with storage methods and API routes for secure feedback submission and retrieval
- **January 26, 2025**: Removed redundant Post Job button from /job-network - Create Work Order button serves the same purpose as work orders automatically post to Job Network when created by Operations Director or Client Company
- **January 26, 2025**: Enhanced Create Work Order functionality - Operations Director can now select client company to post on behalf of or post as themselves, with work orders automatically posting to Job Network and notifying Service Companies in Exclusive Networks
- **January 26, 2025**: Improved talent network filtering system with comprehensive filters for ratings (4.5+ star, 4.0+ star, 3.0+ star, Unrated), experience levels (Senior 5+ years, Mid-level 2-5 years, Junior <2 years), work order completion tiers (High 50+, Medium 10-49, Low <10), and issue status tracking (No Issues, Few Issues 1-2, Many Issues 3+)
- **January 26, 2025**: Enhanced backend field agents API with authentic data - real work order completion counts, actual unresolved issues count per agent, dynamic rating calculation based on performance, years of experience calculated from account creation, and role-specific specializations and certifications
- **January 13, 2025**: Updated Eddy Doescher's user permissions - removed administrator role and company association to ensure he only acts as Operations Director (god mode) unless using role testers
- **January 13, 2025**: Fixed Project Manager navigation system - added project_manager role configuration to navigation component with proper badge display and network access (Project Network, Job Network, Talent Network, Exclusive Network)
- **January 13, 2025**: Removed redundant general role tester component from all dashboard pages while maintaining Service Company Role Tester (purple) and Client Company Role Tester (teal) for comprehensive role testing functionality

## User Preferences
Preferred communication style: Simple, everyday language.
Terminology preference: Organizations providing IT services should be referred to as "Service Companies" (not just "Companies"). Organizations providing work orders and projects to Service Companies should be referred to as "Client Companies" (not just "Companies")

## Terminology
- **Service Company Role Tester**: Purple-colored role tester bar for testing service company roles (Administrator, Manager, Dispatcher, Field Agent)
- **Client Company Role Tester**: Teal-colored role tester bar for testing client company roles (Administrator, Manager, Dispatcher)
- **Role Switcher**: The permanent dropdown button that allows users to switch between Operations Director and Admin roles for EDE
- **Service Company Creation Form**: Form used to create new service companies
- **Client Company Creation Form**: Form used to create new client companies
- **User Creation Form**: General form with selectable role categories (like /onboarding) for creating users
- **Administrator Creation Form**: Specific form for creating administrators
- **Service Companies**: Organizations like EDE and Test Company that provide IT field services (entity type, not user role)
- **Client Companies**: Organizations that require IT services but cannot have Field Agents (entity type, not user role)
- **Client Company Admin**: Administrator role within client companies (user role)
- **Admin Team**: Users with Dispatcher, Manager, and Administrator roles (workflow designation)
- **Chief Team**: Users with Manager and Administrator roles (escalation designation)
- **Job Network**: Public work order posting page accessible to Admin Teams of both Service Companies and Client Companies
- **Exclusive Network**: Private work order posting page accessible only to Admin Teams

## System Architecture

### Frontend Architecture
The client-side is built with React and TypeScript, using a component-based architecture with shadcn/ui for consistent UI. wouter is used for routing and TanStack Query for server state management. The frontend is organized into distinct role-based dashboard views with shared components.

### Backend Architecture
The server uses Express.js with TypeScript, following a RESTful API design. It includes modules for authentication, data operations, and route handling, implementing role-based access control and comprehensive error handling.

### Database Design
PostgreSQL is the primary database, with Drizzle ORM for type-safe operations. The schema includes tables for users, work orders, tasks, time entries, messages, and sessions, supporting hierarchical user roles and task management with referential integrity.

### Authentication & Authorization
Authentication uses Replit's OAuth with session management via connect-pg-simple. The system implements a strict hierarchical role-based authorization system:

**Operations Director (God Mode):**
- Complete system oversight and control
- Only role that can create/delete service companies, clients, and administrators
- Can perform any function across all service companies
- Role Testing: When using Role Tester (white bar), restricted to selected role's capabilities
- Not associated with any service company
- Oversees unresolved issues and app functionality

**Service Company Hierarchy (within each service company):**
1. **Administrator**: User account creation/editing/deletion; work order CRUD and assignment; Job Network access; issue resolution; user suspension/deactivation; messaging
2. **Manager**: Same as Administrator, EXCEPT Administrator can delete Manager but not vice versa
3. **Dispatcher**: Same as Manager, EXCEPT cannot create/delete/edit user accounts
4. **Field Engineer**: Enhanced field operations capabilities; can promote Field Agents; access to advanced technical features; messaging team members
5. **Field Agent**: View/complete assigned work orders only; message team members; edit own contact info; access /mywork dashboard; automatically promoted to Field Engineer after 100 completed work orders

**Test Service Company Structure:**
- Test Service Company exists with full team for role testing
- Test Admin, Test Manager, Test Dispatcher, Test Field Agent users

### State Management
Frontend uses TanStack Query for server state management. Form state is managed with React Hook Form and Zod for validation, sharing schemas between frontend and backend.

### UI/UX Design
The application features a modern design built on Tailwind CSS and shadcn/ui, providing a responsive interface. It emphasizes role-specific workflows with distinct dashboard layouts and a consistent dark theme using a blue-grey color scheme. A comprehensive calendar system with weekly view and advanced filtering is integrated.

### Key Features
- **Hierarchical Role System**: Operations Director (god mode), Administrator, Manager, Dispatcher, Field Agent with strict access controls
- **Operations Director God Mode**: Complete system oversight with dual role testing capabilities via Service Company and Client Company Role Testers
- **Dual Company Type System**: Service Companies (provide IT services) and Client Companies (require IT services) as entity types, not user roles
- **Streamlined Role Testing**: Service Company Role Tester (purple) and Client Company Role Tester (teal) provide complete role testing functionality without redundant general role tester
- **Service Company Management**: Operations Director exclusive service company/client company/administrator creation and deletion
- **Role-based Dashboards**: Operations Director, Administrator, Manager, Dispatcher, Field Agent, and Client Company Admin specific interfaces
- **Work Order Management**: Creation, assignment, status tracking (Scheduled to Mark Complete), task dependencies, and integrated issue reporting
- **Issue Reporting System**: "Create Issue" function on work orders creates hazard alerts requiring Manager+ approval
- **Field Agent Dashboard**: /mywork page displaying cards with work orders assigned to specific Field Agent
- **User Management Hierarchy**: Administrator > Manager > Dispatcher > Field Agent with appropriate CRUD permissions
- **Test Service Company Structure**: Complete test team (Test Admin, Test Manager, Test Dispatcher, Test Field Agent) for role testing
- **Client Company Role Testing**: Operations Director can test Administrator, Manager, and Dispatcher roles within client companies
- **Three-Way Role Selection**: Operations Director, Service Company Admin, and Client Company options in /choose-role page
- **Task Management System**: Fully functional task creation, completion tracking, and category organization (Pre-visit, On-site, Post-site)
- **Time Tracking System**: Real-time check-in/check-out, active timer display, and logged time calculation
- **Budget Management System**: Comprehensive budget creation (fixed, hourly, per-device, materials+labor) with dynamic total calculation
- **Client Management System**: Dedicated client dashboard for work order creation, job network access, and field agent request system
- **Bidirectional Star Rating System**: Comprehensive rating system between clients and service companies with auto-triggering and specific categories
- **Agent Performance Analytics**: Comprehensive performance tracking system aggregating job completion stats, feedback ratings, issue history, audit compliance scores, and timeliness metrics with role-based access controls
- **Client Feedback Loop**: Structured feedback collection system with star ratings, category scores, comments, and "would hire again" tracking for completed work orders
- **Restricted Authentication**: Login limited to pre-approved team members; no self-registration
- **Interactive Work Order Popup**: Enhanced layout with Budget Information positioned above Work Details for improved workflow
- **Talent Network Page**: New page accessible to clients showing field agent cards from all companies with clickable detailed agent profiles and company associations
- **Icon-Based Navigation**: Complete transition from text-based "Back to Dashboard" buttons to intuitive Home (🏠) and Back (←) icons across all pages including Talent Network

##
