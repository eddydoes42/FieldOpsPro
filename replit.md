# FieldOps Pro - IT Field Agent Management System

## Overview
FieldOps Pro is a comprehensive field operations management platform designed to streamline IT field services. It provides advanced operational tools, dynamic time tracking, and enhanced work order capabilities for mobile workforce teams. The system incorporates a hierarchical, role-based access control system including Operations Director, company-level administrators, managers, dispatchers, and field agents. Key features include work order management with integrated issue reporting, user management, real-time messaging, and comprehensive role testing capabilities. The platform aims to improve communication, enhance operational efficiency, and support IT field service companies and their clients. It includes advanced modules for resource optimization, smart routing, agent capabilities, profitability analysis, bidding, credential management, predictive risk, and service quality monitoring.

**Phase 2 Enhancements (Recently Implemented):**
- Enhanced Job Visibility Logic (M3) with sophisticated filtering, location radius calculations, skills matching, and exclusive network support
- Document Uploading Feature (M4) with comprehensive file management, categorization, and role-based access controls
- Structured Issue Creation System (M5) with advanced reporting, auto-escalation, analytics, and comprehensive issue tracking
- Client Feedback Loop (M6) with multi-tier rating system, analytics dashboard, and automated feedback collection workflows

**Latest Updates (December 2024):**
- Fixed Upload Document modal auto-opening issue - modal now only opens on explicit button click
- Implemented comprehensive Operations Director global role bypass for all permission checks with 20+ updated role functions
- Removed persistent role selector dropdown from OD dashboard when not in Role Test mode while preserving Role Test functionality
- Operations Director now has god-mode access to all functions except when in Role Test mode
- Enhanced DocumentUploader component with comprehensive error handling and reliable file picker triggering
- Cleaned up Service Admin references for Operations Director accounts

## User Preferences
Preferred communication style: Simple, everyday language.
Terminology preference: Organizations providing IT services should be referred to as "Service Companies" (not just "Companies"). Organizations providing work orders and projects to Service Companies should be referred to as "Client Companies" (not just "Companies")

## System Architecture

### Frontend Architecture
The client-side is built with React and TypeScript, utilizing a component-based architecture with shadcn/ui for UI consistency and Tailwind CSS for styling. wouter is used for routing and TanStack Query for server state management. The frontend is organized into distinct role-based dashboard views with shared components, emphasizing a responsive interface and a consistent dark theme with a blue-grey color scheme.

### Backend Architecture
The server uses Express.js with TypeScript, following a RESTful API design. It includes modules for authentication, data operations, and route handling, implementing role-based access control and comprehensive error handling.

### Database Design
PostgreSQL is the primary database, with Drizzle ORM for type-safe operations. The schema includes tables for users, work orders, tasks, time entries, messages, sessions, project heartbeats, risk scores, service quality snapshots, and performance data, supporting hierarchical user roles and task management with referential integrity.

### Authentication & Authorization
Authentication uses Replit's OAuth with session management via connect-pg-simple. The system implements a strict hierarchical role-based authorization system:

**Operations Director (God Mode):**
- Complete system oversight and control.
- Only role that can create/delete service companies, client companies, and administrators.
- Can perform any function across all service companies.
- Not associated with any service company, overseeing unresolved issues and app functionality.

**Service Company Hierarchy (within each service company):**
1. **Administrator**: User account creation/editing/deletion; work order CRUD and assignment; Job Network access; issue resolution; user suspension/deactivation; messaging.
2. **Manager**: Similar to Administrator, with the key difference that an Administrator can delete a Manager but not vice versa.
3. **Dispatcher**: Similar to Manager, but cannot create/delete/edit user accounts.
4. **Field Engineer**: Enhanced field operations capabilities; can promote Field Agents; access to advanced technical features; messaging team members.
5. **Field Agent**: View/complete assigned work orders only; message team members; edit own contact info; access /mywork dashboard; automatically promoted to Field Engineer after 100 completed work orders.

### State Management
Frontend uses TanStack Query for server state management. Form state is managed with React Hook Form and Zod for validation, ensuring shared schemas between frontend and backend.

### UI/UX Design
The application features a modern design built on Tailwind CSS and shadcn/ui, providing a responsive interface. It emphasizes role-specific workflows with distinct dashboard layouts and a consistent dark theme using a blue-grey color scheme. A comprehensive calendar system with weekly view and advanced filtering is integrated. Icon-based navigation is used throughout the application.

### Key Features
- **Hierarchical Role System**: Operations Director (god mode), Administrator, Manager, Dispatcher, Field Agent with strict access controls and dual role testing capabilities (Service Company and Client Company Role Testers).
- **Company Types**: Distinct entity types for Service Companies (IT service providers) and Client Companies (IT service requirers).
- **Work Order Management**: Creation, assignment, status tracking, task dependencies, integrated issue reporting, and budget management.
- **Field Agent Dashboard**: Dedicated /mywork page for assigned work orders.
- **User Management Hierarchy**: Defined CRUD permissions based on role hierarchy.
- **Client Management System**: Dedicated client dashboard for work order creation, job network access, and field agent request system.
- **Performance Analytics & Feedback**: Agent performance tracking, bidirectional star rating system, and structured client feedback loops.
- **Advanced Operational Modules**: Includes Job Category Profitability Analysis, Bid & Proposal System, Credential & Compliance Vault, Resource Optimization Engine, Smart Routing & Dispatch, and enhanced agent capabilities.
- **Predictive Risk & Service Quality**: Modules for predictive risk analysis and a service quality dashboard.
- **Talent Network Page**: Accessible to clients, showing field agent cards with detailed profiles and company associations.
- **Restricted Authentication**: Login limited to pre-approved team members; no self-registration.
- **Enhanced Job Visibility (M3)**: Advanced filtering with location radius, skills matching, experience level filtering, and exclusive network support with skill match scoring.
- **Document Management (M4)**: Comprehensive document uploading, categorization (pre/during/post-visit), role-based access controls, and object storage integration.
- **Structured Issue Reporting (M5)**: Advanced issue creation system with categorization, severity levels, auto-escalation for high severity issues, analytics dashboard, and comprehensive tracking.
- **Client Feedback System (M6)**: Multi-tier rating system (field agent, dispatcher, service company), feedback analytics dashboard, automated collection workflows, and trend analysis.

## External Dependencies
- **React**: Frontend UI library.
- **TypeScript**: Programming language for both frontend and backend.
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