# FieldOps Pro - IT Field Agent Management System

## Overview

FieldOps Pro is a full-stack web application designed for managing IT field operations. The system provides role-based dashboards for administrators, managers, and field agents, enabling efficient work order management, time tracking, user onboarding, and real-time messaging. Built with a modern tech stack including React, Express, PostgreSQL, and Drizzle ORM, the application emphasizes clean architecture, type safety, and a seamless user experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side application is built with React and TypeScript, utilizing a component-based architecture with shadcn/ui for consistent UI components. The application uses wouter for client-side routing and TanStack Query for server state management. The frontend is organized into distinct dashboard views based on user roles (administrator, manager, field agent), with shared components for common functionality like navigation, forms, and data display.

### Backend Architecture
The server is implemented using Express.js with TypeScript, following a RESTful API design pattern. The backend includes dedicated modules for authentication (Replit OAuth), data storage operations, and route handling. The server implements role-based access control to ensure appropriate permissions for different user types and includes comprehensive error handling and logging middleware.

### Database Design
The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The schema includes tables for users, work orders, time entries, messages, and sessions. The database design supports hierarchical user roles and maintains referential integrity between related entities like work orders and their assigned agents.

### Authentication & Authorization
Authentication is handled through Replit's OAuth system with session-based management using connect-pg-simple for PostgreSQL session storage. The system implements role-based authorization with three distinct user types: administrators (full system access), managers (team and work order management), and field agents (assigned work and time tracking). Middleware functions protect API endpoints based on user roles and authentication status.

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