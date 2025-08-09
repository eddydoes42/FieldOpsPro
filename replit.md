# FieldOps Pro - IT Field Agent Management System

## Overview

FieldOps Pro is a full-stack web application designed for managing IT field operations. The system provides role-based dashboards for administrators, managers, and field agents, enabling efficient work order management, time tracking, user onboarding, and real-time messaging. Built with a modern tech stack including React, Express, PostgreSQL, and Drizzle ORM, the application emphasizes clean architecture, type safety, and a seamless user experience.

## Current Status (August 2025)

The application is fully operational with comprehensive demo data, modern dark theme, complete multiple role assignment system, and advanced client management capabilities:
- ✓ **Dashboard Route Renamed**: Successfully changed main dashboard route from "/" to "/dashboard" with OAuth callback redirect updated
- ✓ **Navigation System Updated**: Removed deprecated userRole prop from all Navigation components across application
- ✓ Complete role-based authentication and authorization system with administrator-only role assignment
- ✓ Administrator dashboard with real-time statistics and full system access
- ✓ Manager dashboard for team and work order management with priority tasks and active issues sections
- ✓ Field agent dashboard for assigned work and time tracking
- ✓ **Consistent Navigation**: Back to Dashboard buttons added to all main pages (Work Orders, Messages, Onboarding, Team Reports, Team Management) for seamless navigation back to role-specific dashboards
- ✓ **Complete Client Management System**: Full client role implementation with work order creation and field agent request system
  - **Client Dashboard**: Dedicated interface for clients to create work orders and review agent assignment requests
  - **Job Network**: Management interface for admins/managers/dispatchers to view client-created orders and assign field agents
  - **Field Agent Request System**: Clients can review agent performance history and approve/decline assignment requests
  - **Operations Director Client Onboarding**: Only operations directors can create client users through the onboarding system
- ✓ **Operations Director Role Testing Feature**: Advanced role switching capability for system testing
  - **Role Switcher Component**: Operations directors can switch between all role dashboards to test functionality
  - **Testing Mode Indicators**: Clear visual indicators when in testing mode with reset functionality
  - **Comprehensive Role Access**: Full access to administrator, manager, dispatcher, field agent, and client dashboards
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
- ✓ **Comprehensive Budget Management System**: Administrator and manager budget creation and tracking
  - **Mandatory Budget Creation**: Budget information is required when administrators and managers create work orders
  - **Integrated Budget Creation**: Budget setup integrated into work order creation form for administrators and managers
  - **Three Budget Types**: Fixed amount, hourly rate (calculated from logged time), and per-device pricing
  - **Real-time Calculations**: Budget totals automatically calculated based on time logged or devices installed
  - **Admin/Manager Access**: Only administrators and managers can create and view budget information
  - **Budget Display**: Budget information shown on work order cards and detailed view dialogs
  - **Database Integration**: Complete backend API with budget calculation endpoints
- ✓ **Role-based permissions with clear access controls**:
  - **Field Agents**: Can only view and complete work orders assigned to them
  - **Dispatchers**: Can view and complete work orders assigned to any field agent, create and delete work orders (cannot use onboarding functions)
  - **Managers**: Same abilities as dispatchers plus onboarding functions and budget management
  - **Administrators**: Full access to all functions including role assignment, user creation, and budget management

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
- ✓ **Clean Dashboard Interface**: Removed quick action icons from top of dashboard pages and navigation header while preserving floating action button at bottom right
- ✓ **Comprehensive Calendar System**: Full-featured work order calendar with role-based access and advanced filtering
  - **Weekly View Layout**: Enhanced weekly calendar display for improved spacing and readability instead of monthly grid
  - **Automatic Population**: Work orders automatically appear on calendar based on their due dates
  - **Role-based Views**: Administrators, managers, and dispatchers see all work orders; field agents see only assigned orders
  - **Advanced Filtering**: Filter by agent, status, and priority (available to management roles)
  - **Enhanced Work Order Cards**: Color-coded priority indicators, status badges, and detailed information in larger day cells
  - **Detailed Work Order Dialog**: Click any work order for full details and quick navigation to work orders page
  - **Navigation Integration**: Calendar accessible from main navigation and quick action menu for all user roles
  - **Responsive Design**: Optimized weekly calendar interface with better spacing and work order visibility
- ✓ **Multiple Role Assignment System**: Complete system allowing users to have multiple roles simultaneously
  - **Database Migration**: Successfully migrated from single role field to roles array in PostgreSQL database
  - **Backend Implementation**: Full API support with hasRole(), hasAnyRole(), canViewAllOrders(), and canManageUsers() utility functions
  - **Frontend Integration**: Checkbox-based multi-role selection in onboarding form and role priority display
  - **Navigation Enhancement**: Role priority logic (administrator > manager > field_agent) for consistent user experience
  - **Access Control Updates**: All pages and components updated to support multiple role checking
  - **Type Safety**: Complete TypeScript integration with proper type definitions for role arrays
- ✓ **Client Role System**: Full client role implementation with restricted access and company information
  - **Administrator-Only Creation**: Client role can only be assigned by administrators in the onboarding form
  - **Client-Specific Fields**: Added company name and role within company fields for client users
  - **Database Schema Updates**: Added client_company_name and client_role columns to users table
  - **Dashboard Integration**: Client count displayed in administrator dashboard statistics
  - **Conditional UI**: Client information fields only appear when client role is selected
  - **Role Permission Functions**: Added isClient() function and updated role-based access controls

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