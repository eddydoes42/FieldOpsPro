# FieldOps Pro - IT Field Agent Management System

## Overview
FieldOps Pro is a comprehensive field operations management platform for IT field services. It provides advanced operational tools, dynamic time tracking, and enhanced work order capabilities for mobile workforce teams. The system includes a hierarchical, role-based access control system for Operations Directors, company-level administrators, managers, dispatchers, and field agents. Key features encompass work order management with integrated issue reporting, user management, real-time messaging, and comprehensive role testing. The platform aims to improve communication and operational efficiency for IT field service companies and their clients, offering modules for resource optimization, smart routing, profitability analysis, bidding, credential management, predictive risk, and service quality monitoring. Recent enhancements include advanced job visibility, document uploading, a structured issue creation system, and a client feedback loop.

## User Preferences
Preferred communication style: Simple, everyday language.
Terminology preference: Organizations providing IT services should be referred to as "Service Companies" (not just "Companies"). Organizations providing work orders and projects to Service Companies should be referred to as "Client Companies" (not just "Companies")

## System Architecture

### Frontend Architecture
The client-side is built with React and TypeScript, using a component-based architecture with shadcn/ui for UI consistency and Tailwind CSS for styling. wouter handles routing, and TanStack Query manages server state. The frontend features distinct role-based dashboard views, shared components, a responsive interface, and a consistent dark theme with a blue-grey color scheme. A comprehensive calendar system with weekly view and advanced filtering is integrated, and icon-based navigation is used throughout.

### Backend Architecture
The server uses Express.js with TypeScript, following a RESTful API design. It includes modules for authentication, data operations, and route handling, implementing role-based access control and comprehensive error handling. The architecture emphasizes an enterprise-grade design with dependency injection, a service-oriented approach, and a core infrastructure including EventBus, Logger, RBACService, SecurityService, and Bootstrap system. Centralized security middleware provides rate limiting, request validation, and audit logging.

### Database Design
PostgreSQL serves as the primary database, with Drizzle ORM providing type-safe operations. The schema includes tables for users, work orders, tasks, time entries, messages, sessions, project heartbeats, risk scores, service quality snapshots, and performance data, supporting hierarchical user roles and task management with referential integrity.

### Authentication & Authorization
Authentication uses Replit's OAuth with session management via connect-pg-simple. A strict hierarchical role-based authorization system is implemented, covering:
- **Operations Director**: Complete system oversight, creation/deletion of service companies, client companies, and administrators, and role testing.
- **Service Company Hierarchy (Administrator, Project Manager, Manager, Dispatcher, Field Agent)**: Defined CRUD permissions for user accounts, work orders, projects, issues, and expenses, with specific approval flows for assignments, promotions, and financial disbursements. All actions are logged for audit and compliance.
- **Job Network**: A shared platform for Service Companies and Client Companies to view, post, and manage work orders. Client Company posts are public, while Service Company posts are internal. Users can request assignments at posted budgets or submit counter-proposals with alternative terms. Role-based capabilities dictate who can view, request, approve, or deny requests, with filters for status, role eligibility, company type, budget, location, and deadline.

### State Management
Frontend server state is managed by TanStack Query. Form state is handled by React Hook Form, with Zod used for validation, ensuring shared schemas between frontend and backend.

### UI/UX Design
The application features a modern design built on Tailwind CSS and shadcn/ui, providing a responsive interface. It emphasizes role-specific workflows with distinct dashboard layouts and a consistent dark theme using a blue-grey color scheme.

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