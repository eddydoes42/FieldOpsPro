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

// Lazy load ClientDashboard and ClientWorkOrders
const ClientDashboard = React.lazy(() => import('@/pages/client-dashboard'));
const ClientWorkOrders = React.lazy(() => import('@/pages/client-work-orders'));

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [testingRole, setTestingRole] = useState<string | null>(null);
  const [permanentRole, setPermanentRole] = useState<string | null>(() => {
    // Initialize permanent role from localStorage
    return localStorage.getItem('selectedRole');
  });
  
  // Get the effective role for operations directors who are testing other roles or have permanent role selection
  const getEffectiveRole = () => {
    // Permanent role takes precedence over testing role
    if (permanentRole) {
      return permanentRole;
    }
    if (isOperationsDirector(user as any) && testingRole) {
      return testingRole;
    }
    return getPrimaryRole(user as any);
  };

  const handleRoleSwitch = (role: string) => {
    // Clear permanent role when testing roles to allow testing role to take effect
    setPermanentRole(null);
    localStorage.removeItem('selectedRole');
    setTestingRole(role);
    // Store testing role for API headers
    localStorage.setItem('testingRole', role);
  };

  const handlePermanentRoleSwitch = (role: string) => {
    setPermanentRole(role);
    localStorage.setItem('selectedRole', role);
    // Clear any testing role when switching permanently
    setTestingRole(null);
    localStorage.removeItem('testingRole');
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
                if (hasOpsDirector && hasAdmin && !selectedRole && !testingRole && !permanentRole) {
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
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} />
                {isAuthenticated ? <WorkOrders /> : <Landing />}
              </div>
            </Route>
            <Route path="/client/work-orders">
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} />
                <Suspense fallback={<div className="p-4">Loading...</div>}>
                  <ClientWorkOrders />
                </Suspense>
              </div>
            </Route>
            <Route path="/messages">
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} />
                {isAuthenticated ? <Messages /> : <Landing />}
              </div>
            </Route>
            <Route path="/calendar">
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} />
                {isAuthenticated ? <Calendar /> : <Landing />}
              </div>
            </Route>
            <Route path="/job-network">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const hasJobNetworkAccess = ['administrator', 'manager', 'dispatcher', 'client'].includes(effectiveRole);
                
                if (isAuthenticated && hasJobNetworkAccess) {
                  const JobNetwork = React.lazy(() => import('@/pages/job-network'));
                  return (
                    <div>
                      <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} />
                      <Suspense fallback={<div className="p-4">Loading job network...</div>}>
                        <JobNetwork />
                      </Suspense>
                    </div>
                  );
                }
                return <Landing />;
              })()}
            </Route>
            <Route path="/time-tracking">
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} />
                {isAuthenticated ? <TimeTracking /> : <Landing />}
              </div>
            </Route>
            <Route path="/client-dashboard">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const hasClientAccess = hasRole(user as any, 'client') || effectiveRole === 'client';
                
                if (isAuthenticated && hasClientAccess) {
                  return (
                    <Suspense fallback={<div className="p-4">Loading client dashboard...</div>}>
                      <div>
                        {isOperationsDirector(user as any) && (
                          <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} />
                        )}
                        {(() => {
                          const ClientDashboard = React.lazy(() => import('@/pages/client-dashboard'));
                          return <ClientDashboard />;
                        })()}
                      </div>
                    </Suspense>
                  );
                }
                return <Landing />;
              })()}
            </Route>
            <Route path="/client/work-orders">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const hasClientAccess = hasRole(user as any, 'client') || effectiveRole === 'client';
                
                if (isAuthenticated && hasClientAccess) {
                  return (
                    <Suspense fallback={<div className="p-4">Loading client work orders...</div>}>
                      <div>
                        {isOperationsDirector(user as any) && (
                          <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} />
                        )}
                        {(() => {
                          const ClientWorkOrders = React.lazy(() => import('@/pages/client-work-orders'));
                          return <ClientWorkOrders />;
                        })()}
                      </div>
                    </Suspense>
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
