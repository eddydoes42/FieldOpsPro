# FieldOps Pro - IT Field Agent Management System

## Overview

FieldOps Pro is a full-stack web application designed for managing IT field operations. The system provides role-based dashboards for administrators, managers, and field agents, enabling efficient work order management, time tracking, user onboarding, and real-time messaging. Built with a modern tech stack including React, Express, PostgreSQL, and Drizzle ORM, the application emphasizes clean architecture, type safety, and a seamless user experience.

## Current Status (August 2025)

The application is fully operational with comprehensive demo data and modern dark theme:
- ✓ Complete role-based authentication and authorization system with administrator-only role assignment
- ✓ Administrator dashboard with real-time statistics and full system access
- ✓ Manager dashboard for team and work order management with priority tasks and active issues sections
- ✓ Field agent dashboard for assigned work and time tracking
- ✓ **Consistent Navigation**: Back to Dashboard buttons added to all main pages (Work Orders, Messages, Onboarding, Team Reports, Team Management) for seamless navigation back to role-specific dashboards
- ✓ **Task Management System**: Pre-visit, on-site, and post-site task tracking for work orders
  - Administrators and managers can create and assign tasks
  - Field agents and managers can mark tasks as complete
  - Tasks organized by phase with visual progress indicators
  - Complete task lifecycle management with timestamps
- ✓ **Work Order Status Management with Task Dependencies**: Complete workflow system
  - **Status Flow**: Scheduled → Confirmed → In Route → Check In → Check Out → Mark Complete
  - **24-Hour Confirmation Rule**: Field agents can only confirm within 24 hours of due date or after due date passes
  - **Task Completion Requirements**: All tasks must be completed before work status progression beyond confirmation
  - **Role-based Access**: Administrators, managers, and dispatchers can manage any work order; field agents limited to assigned orders
  - **Comprehensive Authorization**: Management roles can confirm and update status for any work order
- ✓ **Comprehensive Time Tracking System**: Real-time work session monitoring
  - **Check-in/Check-out Functionality**: Automated time tracking with status transitions
  - **Active Timer Display**: Visual indicators showing when time tracking is active with pulsing green dot
  - **Time Calculation & Display**: Work order cards show total logged time in hours and minutes format
  - **Time Entry API**: Backend endpoints for fetching time data per work order and user
  - **Real-time Updates**: Time tracking data refreshes automatically when status changes
- ✓ **Role-based permissions with clear access controls**:
  - **Field Agents**: Can only view and complete work orders assigned to them
  - **Dispatchers**: Can view and complete work orders assigned to any field agent, create and delete work orders (cannot use onboarding functions)
  - **Managers**: Same abilities as dispatchers plus onboarding functions
  - **Administrators**: Full access to all functions including role assignment and user creation
- ✓ **Restricted Authentication System**: Login access limited to pre-existing team members only
  - **Pre-approval Required**: Users must be created through "Team Member Information" menu before they can login
  - **No Auto-registration**: Automatic user creation on first login is disabled
  - **Access Control**: Authentication fails with clear error message for unauthorized users
  - **Admin-only User Creation**: Only administrators can add new team members to the system
- ✓ Sample data: 6 users (1 admin, 1 manager, 4 field agents)
- ✓ 6 work orders with various statuses and assignments
- ✓ Time tracking entries including active sessions with logged hours display
- ✓ Team messaging system with conversation history
- ✓ Dashboard statistics showing live data from PostgreSQL database
- ✓ **Dark theme implementation** with professional blue-grey color scheme across all components
- ✓ Enhanced manager dashboard with priority tasks (high-priority work orders) and active issues sections

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side application is built with React and TypeScript, utilizing a component-based architecture with shadcn/ui for consistent UI components. The application uses wouter for client-side routing and TanStack Query for server state management. The frontend is organized into distinct dashboard views based on user roles (administrator, manager, field agent), with shared components for common functionality like navigation, forms, and data display.

### Backend Architecture
The server is implemented using Express.js with TypeScript, following a RESTful API design pattern. The backend includes dedicated modules for authentication (Replit OAuth), data storage operations, and route handling. The server implements role-based access control to ensure appropriate permissions for different user types and includes comprehensive error handling and logging middleware.

### Database Design
The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The schema includes tables for users, work orders, work order tasks, time entries, messages, and sessions. The database design supports hierarchical user roles, task management with phase categorization (pre-visit, on-site, post-site), and maintains referential integrity between related entities like work orders and their assigned agents.

### Authentication & Authorization
Authentication is handled through Replit's OAuth system with session-based management using connect-pg-simple for PostgreSQL session storage. The system implements role-based authorization with three distinct user types: administrators (full system access including role assignment), managers (team and work order management, task creation), and field agents (assigned work and time tracking, task completion). Middleware functions protect API endpoints based on user roles and authentication status, with strict role assignment restrictions limiting user creation to administrators only.

### State Management
The frontend uses TanStack Query for server state management, providing automatic caching, background updates, and optimistic updates. Form state is managed using React Hook Form with Zod validation schemas shared between frontend and backend for consistent data validation.

### UI/UX Design
The application uses a modern design system built on Tailwind CSS and shadcn/ui components, providing a responsive and accessible interface. The design emphasizes role-specific workflows with distinct dashboard layouts and navigation patterns for each user type.

## External Dependencies

### Database & ORM
- **PostgreSQL**: Primary database for persistent data storage
- **Drizzle ORM**: Type-safe database operations with automatic migrations
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support

### Authentication
- **Replit OAuth**: Primary authentication provider
- **connect-pg-simple**: PostgreSQL session storage
- **Passport.js**: Authentication middleware for Express

### Frontend Libraries
- **React**: Core UI framework with TypeScript support
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management and validation
- **wouter**: Lightweight client-side routing
- **shadcn/ui**: Modern React component library
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework

### Backend Dependencies
- **Express.js**: Web application framework
- **Zod**: Runtime type validation
- **date-fns**: Date manipulation utilities

### Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Static type checking
- **ESBuild**: JavaScript bundler for production builds