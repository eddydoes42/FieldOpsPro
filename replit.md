# FieldOps Pro - IT Field Agent Management System

## Overview
FieldOps Pro is a comprehensive field operations management platform that empowers mobile workforce teams with advanced operational tools, dynamic time tracking, and enhanced work order capabilities. It offers role-based dashboards for administrators, managers, and field agents, enabling work order management, time tracking, user onboarding, and real-time messaging. The system includes a comprehensive bidirectional star rating system for clients and service companies, advanced client management with work order creation and agent request systems, and a robust task management system with work order status dependencies. The application aims to streamline IT field services, improve communication, and enhance operational efficiency.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built with React and TypeScript, using a component-based architecture with shadcn/ui for consistent UI. wouter is used for routing and TanStack Query for server state management. The frontend is organized into distinct role-based dashboard views with shared components.

### Backend Architecture
The server uses Express.js with TypeScript, following a RESTful API design. It includes modules for authentication, data operations, and route handling, implementing role-based access control and comprehensive error handling.

### Database Design
PostgreSQL is the primary database, with Drizzle ORM for type-safe operations. The schema includes tables for users, work orders, tasks, time entries, messages, and sessions, supporting hierarchical user roles and task management with referential integrity.

### Authentication & Authorization
Authentication uses Replit's OAuth with session management via connect-pg-simple. Role-based authorization is implemented for administrators, managers, field agents, and clients, with strict access controls and administrator-only user creation. Users can have multiple roles simultaneously.

### State Management
Frontend uses TanStack Query for server state management. Form state is managed with React Hook Form and Zod for validation, sharing schemas between frontend and backend.

### UI/UX Design
The application features a modern design built on Tailwind CSS and shadcn/ui, providing a responsive interface. It emphasizes role-specific workflows with distinct dashboard layouts and a consistent dark theme using a blue-grey color scheme. A comprehensive calendar system with weekly view and advanced filtering is integrated.

### Key Features
- **Role-based Dashboards**: Administrator, Manager, Dispatcher, Field Agent, and Client specific interfaces.
- **Work Order Management**: Creation, assignment, status tracking (Scheduled to Mark Complete), and task dependencies.
- **Task Management System**: Fully functional task creation, completion tracking, and category organization (Pre-visit, On-site, Post-site).
- **Time Tracking System**: Real-time check-in/check-out, active timer display, and logged time calculation.
- **Budget Management System**: Comprehensive budget creation (fixed, hourly, per-device, materials+labor) with dynamic total calculation.
- **Client Management System**: Dedicated client dashboard for work order creation, job network access, and field agent request system.
- **Bidirectional Star Rating System**: Comprehensive rating system between clients and service companies with auto-triggering and specific categories.
- **Multiple Role Assignment**: Users can hold multiple roles simultaneously with priority logic.
- **Restricted Authentication**: Login limited to pre-approved team members; no self-registration.
- **Operations Director Role Testing Feature**: Advanced role switching for system testing with proper dashboard navigation.
- **Interactive Work Order Popup**: Enhanced layout with Budget Information positioned above Work Details for improved workflow.
- **Talent Network Page**: New page accessible to clients showing field agent cards from all companies with clickable detailed agent profiles and company associations.
- **Icon-Based Navigation**: Complete transition from text-based "Back to Dashboard" buttons to intuitive Home (🏠) and Back (←) icons across all pages including Talent Network.

## External Dependencies

### Database & ORM
- **PostgreSQL**
- **Drizzle ORM**
- **Neon Database**

### Authentication
- **Replit OAuth**
- **connect-pg-simple**
- **Passport.js**

### Frontend Libraries
- **React**
- **TanStack Query**
- **React Hook Form**
- **wouter**
- **shadcn/ui**
- **Radix UI**
- **Tailwind CSS**

### Backend Dependencies
- **Express.js**
- **Zod**
- **date-fns**