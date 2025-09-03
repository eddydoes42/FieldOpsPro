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