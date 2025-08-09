import React, { useState, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { hasRole, hasAnyRole, isOperationsDirector, canViewJobNetwork, getPrimaryRole } from "../../shared/schema";
import RoleSwitcher from "@/components/role-switcher";
import Landing from "@/pages/landing";
import OperationsDirectorDashboard from "@/pages/operations-director-dashboard";
import OperationsCompanies from "@/pages/operations-companies";
import OperationsActiveAdmins from "@/pages/operations-active-admins";

import OperationsRecentSetups from "@/pages/operations-recent-setups";
import AdminDashboard from "@/pages/admin-dashboard";
import ManagerDashboard from "@/pages/manager-dashboard";
import AgentDashboard from "@/pages/agent-dashboard";
import RoleSelection from "@/components/role-selection";
import TeamReports from "@/pages/team-reports";
import TeamPage from "@/pages/team";
import Onboarding from "@/pages/onboarding";
import WorkOrders from "@/pages/work-orders";
import Messages from "@/pages/messages";
import Calendar from "@/pages/calendar";
import TimeTracking from "@/pages/time-tracking";
import NotFound from "@/pages/not-found";
import FloatingQuickAction from "@/components/floating-quick-action";

// Lazy load ClientDashboard
const ClientDashboard = React.lazy(() => import('@/pages/client-dashboard'));

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [testingRole, setTestingRole] = useState<string | null>(null);
  
  // Get the effective role for operations directors who are testing other roles
  const getEffectiveRole = () => {
    if (isOperationsDirector(user as any) && testingRole) {
      return testingRole;
    }
    return getPrimaryRole(user as any);
  };

  const handleRoleSwitch = (role: string) => {
    setTestingRole(role);
  };
  


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div data-quick-actions="true" className="quick-action-zone">
      <Switch>
        {!isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/">
              <Landing />
            </Route>
            <Route path="/choose-role">
              <RoleSelection user={user} />
            </Route>
            <Route path="/dashboard">
              {(() => {
                const selectedRole = localStorage.getItem('selectedRole');
                const hasOpsDirector = isOperationsDirector(user as any);
                const hasAdmin = hasRole(user as any, 'administrator');
                const effectiveRole = getEffectiveRole();
                
                // If user has both operations director and admin roles and hasn't chosen, redirect to role selection
                if (hasOpsDirector && hasAdmin && !selectedRole && !testingRole) {
                  setLocation('/choose-role');
                  return null;
                }
                
                const DashboardContent = () => {
                  // Use effective role for dashboard rendering
                  if (effectiveRole === 'operations_director') {
                    return <OperationsDirectorDashboard />;
                  } else if (effectiveRole === 'administrator') {
                    return <AdminDashboard />;
                  } else if (effectiveRole === 'manager') {
                    return <ManagerDashboard />;
                  } else if (effectiveRole === 'field_agent') {
                    return <AgentDashboard />;
                  } else if (effectiveRole === 'client') {
                    return (
                      <Suspense fallback={<div className="p-4">Loading client dashboard...</div>}>
                        <ClientDashboard />
                      </Suspense>
                    );
                  } else {
                    return <Landing />;
                  }
                };

                return (
                  <div>
                    {/* Role switcher for operations directors */}
                    <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} />
                    <DashboardContent />
                  </div>
                );
              })()}
            </Route>
            <Route path="/operations-dashboard">
              {(() => {
                const effectiveRole = getEffectiveRole();
                
                const DashboardContent = () => {
                  if (effectiveRole === 'operations_director') {
                    return <OperationsDirectorDashboard />;
                  } else if (effectiveRole === 'administrator') {
                    return <AdminDashboard />;
                  } else if (effectiveRole === 'manager') {
                    return <ManagerDashboard />;
                  } else if (effectiveRole === 'dispatcher') {
                    return <ManagerDashboard />;
                  } else if (effectiveRole === 'field_agent') {
                    return <AgentDashboard />;
                  } else if (effectiveRole === 'client') {
                    return (
                      <Suspense fallback={<div className="p-4">Loading client dashboard...</div>}>
                        <ClientDashboard />
                      </Suspense>
                    );
                  } else {
                    return <OperationsDirectorDashboard />;
                  }
                };

                return (
                  <div>
                    <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} />
                    <DashboardContent />
                  </div>
                );
              })()}
            </Route>
            <Route path="/operations/companies">
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} />
                <OperationsCompanies />
              </div>
            </Route>
            <Route path="/operations/active-admins">
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} />
                <OperationsActiveAdmins />
              </div>
            </Route>

            <Route path="/operations/recent-setups">
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} />
                <OperationsRecentSetups />
              </div>
            </Route>
            <Route path="/admin-dashboard">
              <AdminDashboard />
            </Route>
            <Route path="/reports">
              {hasAnyRole(user as any, ['administrator', 'manager']) ? (
                <TeamReports />
              ) : hasRole(user as any, 'field_agent') ? (
                <AgentDashboard />
              ) : (
                <Landing />
              )}
            </Route>
            <Route path="/reports/team">
              {hasAnyRole(user as any, ['administrator', 'manager']) ? (
                <TeamReports />
              ) : hasRole(user as any, 'field_agent') ? (
                <AgentDashboard />
              ) : (
                <Landing />
              )}
            </Route>
            <Route path="/team">
              {hasAnyRole(user as any, ['administrator', 'manager']) ? (
                <TeamPage />
              ) : hasRole(user as any, 'field_agent') ? (
                <AgentDashboard />
              ) : (
                <Landing />
              )}
            </Route>
            <Route path="/onboarding">
              {hasAnyRole(user as any, ['administrator', 'manager']) ? (
                <Onboarding />
              ) : hasRole(user as any, 'field_agent') ? (
                <AgentDashboard />
              ) : (
                <Landing />
              )}
            </Route>
            <Route path="/work-orders">
              {isAuthenticated ? <WorkOrders /> : <Landing />}
            </Route>
            <Route path="/messages">
              {isAuthenticated ? <Messages /> : <Landing />}
            </Route>
            <Route path="/calendar">
              {isAuthenticated ? <Calendar /> : <Landing />}
            </Route>
            <Route path="/job-network">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const hasJobNetworkAccess = ['administrator', 'manager', 'dispatcher'].includes(effectiveRole);
                
                if (isAuthenticated && hasJobNetworkAccess) {
                  const JobNetwork = React.lazy(() => import('@/pages/job-network'));
                  return (
                    <div>
                      <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} />
                      <JobNetwork />
                    </div>
                  );
                }
                return <Landing />;
              })()}
            </Route>
            <Route path="/time-tracking">
              {isAuthenticated ? <TimeTracking /> : <Landing />}
            </Route>
            <Route path="/job-network">
              {canViewJobNetwork(user as any) ? (
                (() => {
                  const JobNetwork = React.lazy(() => import('@/pages/job-network'));
                  return <JobNetwork />;
                })()
              ) : (
                <Landing />
              )}
            </Route>
            <Route path="/client-dashboard">
              {hasRole(user as any, 'client') ? (
                (() => {
                  const ClientDashboard = React.lazy(() => import('@/pages/client-dashboard'));
                  return <ClientDashboard />;
                })()
              ) : (
                <Landing />
              )}
            </Route>
            <Route path="/client/work-orders">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const hasClientAccess = hasRole(user as any, 'client') || effectiveRole === 'client';
                
                if (isAuthenticated && hasClientAccess) {
                  const ClientWorkOrders = React.lazy(() => import('@/pages/client-work-orders'));
                  return (
                    <div>
                      {isOperationsDirector(user as any) && (
                        <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} />
                      )}
                      <Suspense fallback={<div className="p-4">Loading client work orders...</div>}>
                        <ClientWorkOrders />
                      </Suspense>
                    </div>
                  );
                }
                return <Landing />;
              })()}
            </Route>
        </>
      )}
      <Route component={NotFound} />
      </Switch>
      
      {/* Global Floating Quick Action Button - Exclude from landing page */}
      {isAuthenticated && location !== "/" && <FloatingQuickAction />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
