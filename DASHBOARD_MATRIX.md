# FieldOps Pro - Dashboard Matrix

## Role-Based Dashboard Components Mapping

This matrix defines which dashboard cards/components should appear for each role based on their permissions.

### **Operations Director (Level 1000)**
**Permissions**: Global bypass (`resource: '*', action: '*'`)

**Dashboard Cards:**
- Platform Statistics (Companies, Admins, Users)
- System Health Monitoring
- Budget & Revenue Analytics  
- Service Fee Summary
- Recent Company Setups
- Access Request Management
- Approval Request Management
- Role Simulation Controls
- Company Onboarding Forms
- Advanced Analytics & Reports

**Navigation Access:**
- Operations Dashboard, Companies, Administrators, Recent Setups, Job Network, Talent Network, Project Network, Exclusive Networks, Messages

---

### **Service Company Administrator (Level 900)**
**Company Type**: service  
**Permissions**: users(*), workOrders(*), companies(read/update), jobNetwork(*), issues(*), messaging(*), reports(*), analytics(*)

**Dashboard Cards:**
- Company Performance Overview
- Team Management Dashboard
- Work Order Statistics
- Job Network Activity  
- Issue Management Summary
- Revenue & Budget Analytics
- Client Feedback Summary
- Team Performance Metrics
- Resource Allocation Tools

**Navigation Access:**
- Dashboard, Team, Job Network, Project Network, Work Orders, Job Requests, Calendar, Reports, Team Member Information, Messages

---

### **Client Company Administrator (Level 900)**
**Company Type**: client  
**Role**: administrator ✅ **UNIFIED ROLE NAME**
**Permissions**: workOrders(create), workOrders(read+own_company), jobNetwork(read), fieldAgents(read), serviceCompanies(read)

**Dashboard Cards:**
- Active Work Orders (Own Company)
- Service Company Directory
- Available Field Agents/Engineers
- Job Network Browse
- Work Order Creation Tools
- Service Request Management
- Budget Overview (Read-only)
- Service Quality Feedback

**Navigation Access:**
- Dashboard, Work Orders, Job Network, Talent Network, Messages

---

### **Project Manager (Level 850)**
**Available for**: Both service and client companies
**Permissions**: users(read/update), workOrders(*), companies(read), jobNetwork(*), issues(*), messaging(*), reports(*), analytics(read)

**Dashboard Cards:**
- Project Portfolio Overview
- Resource Planning Tools
- Timeline & Milestone Tracking
- Team Coordination Hub
- Budget Management Dashboard
- Risk Assessment Tools
- Performance Analytics (Read-only)
- Issue Escalation Management

---

### **Manager (Level 800)**
**Available for**: Both service and client companies  
**Permissions**: users(read/update), workOrders(*), jobNetwork(*), issues(*), messaging(*), reports(read)

**Dashboard Cards:**
- Team Performance Dashboard
- Work Order Assignment Hub
- Resource Optimization
- Issue Resolution Tracking
- Job Network Management
- Reports Dashboard (Read-only)
- Team Communication Hub

---

### **Dispatcher (Level 700)**
**Permissions**: users(read), workOrders(*), jobNetwork(read), issues(read/update), messaging(*)

**Dashboard Cards:**
- Work Order Dispatch Board
- Agent Availability Matrix
- Job Queue Management
- Assignment Optimization
- Communication Center
- Issue Tracking (Read/Update)
- Route Planning Tools

---

### **Field Engineer (Level 600)**
**Permissions**: workOrders(read/update), users(read), fieldAgents(promote), messaging(*), documents(*)

**Dashboard Cards:**
- Assigned Work Orders
- Field Agent Team Management
- Technical Documentation Hub
- Performance Tools
- Communication Center
- Promotion Recommendations
- Skills Development Tracker

---

### **Field Agent (Level 500)**
**Permissions**: workOrders(read/update+assigned_to_user), messaging(read/create), documents(read/upload), profile(update+own_profile)

**Dashboard Cards:**
- My Active Work Orders
- Today's Schedule
- Time Tracking Tools
- Document Upload Center
- Message Center
- Profile Management
- Skills & Certifications

---

## Implementation Requirements

### **Conditional Rendering Logic**
```typescript
// Example for dashboard card visibility
const showCard = (cardPermissions: {resource: string, action: string}) => {
  return hasPermission(user, cardPermissions.resource, cardPermissions.action);
}

// Role-specific dashboard components
const getDashboardCards = (userRole: string, companyType: 'service' | 'client') => {
  // Implementation based on above matrix
}
```

### **Key Fixes Needed**
1. **Unify Administrator Role**: Change `client_company_admin` to `administrator` everywhere
2. **Company Type Context**: Distinguish administrators by company type, not role name
3. **Permission Integration**: Connect RBAC permissions to dashboard card visibility
4. **Role Simulator**: Update to handle unified administrator role