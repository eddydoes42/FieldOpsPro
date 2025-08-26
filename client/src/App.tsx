import React, { useState, Suspense, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { hasRole, hasAnyRole, isOperationsDirector, canViewJobNetwork, getPrimaryRole } from "../../shared/schema";
import RoleSwitcher from "@/components/role-switcher";
import Navigation from "@/components/navigation";

import Landing from "@/pages/landing";
import OperationsDirectorDashboard from "@/pages/operations-director-dashboard";
import OperationsCompanies from "@/pages/operations-companies";
import OperationsActiveAdmins from "@/pages/operations-active-admins";
import OperationsExclusiveNetwork from "@/pages/operations-exclusive-network";

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
import FieldAgentWork from "@/pages/field-agent-work";
import FieldAgentSettings from "@/pages/field-agent-settings";
import MyWork from "@/pages/mywork";

// Lazy load Client pages
const ClientDashboard = React.lazy(() => import('@/pages/client-dashboard'));
const JobNetwork = React.lazy(() => import('@/pages/job-network'));

// Import Talent Network and Project Network
import TalentNetworkPage from '@/pages/talent-network';
import ProjectNetworkPage from '@/pages/project-network';
import ProjectManagerDashboard from '@/pages/project-manager-dashboard';

// Dashboard Route Component
function DashboardRoute({ user, getEffectiveRole, handleRoleSwitch, testingRole, permanentRole, setLocation }: any) {
  const selectedRole = localStorage.getItem('selectedRole');
  const hasOpsDirector = isOperationsDirector(user as any);
  const hasAdmin = hasRole(user as any, 'administrator');
  const effectiveRole = getEffectiveRole();
  
  // Handle redirect to role selection
  useEffect(() => {
    if (hasOpsDirector && hasAdmin && !selectedRole && !testingRole && !permanentRole) {
      setLocation('/choose-role');
    }
  }, [hasOpsDirector, hasAdmin, selectedRole, testingRole, permanentRole, setLocation]);
  
  // If user needs to choose role, show loading until redirect
  if (hasOpsDirector && hasAdmin && !selectedRole && !testingRole && !permanentRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const DashboardContent = () => {
    // Use effective role for dashboard rendering
    if (effectiveRole === 'operations_director') {
      return <OperationsDirectorDashboard />;
    } else if (effectiveRole === 'administrator') {
      return <AdminDashboard />;
    } else if (effectiveRole === 'project_manager') {
      return <ProjectManagerDashboard />;
    } else if (effectiveRole === 'manager') {
      return <ManagerDashboard />;
    } else if (effectiveRole === 'field_agent') {
      return <AgentDashboard />;
    } else if (effectiveRole === 'client_company_admin') {
      return (
        <Suspense fallback={<div className="p-4">Loading client dashboard...</div>}>
          <ClientDashboard user={user} />
        </Suspense>
      );
    } else {
      return <Landing />;
    }
  };

  return (
    <div>
      {/* Navigation for all dashboard users */}
      <Navigation 
        testingRole={testingRole || undefined} 
        currentActiveRole={permanentRole || getPrimaryRole(user as any)}
        onPermanentRoleSwitch={(role) => {
          localStorage.setItem('selectedRole', role);
          window.location.reload();
        }}
      />
      {/* Role switcher for operations directors */}
      <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || getPrimaryRole(user as any)} />
      <DashboardContent />
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [testingRole, setTestingRole] = useState<string | null>(() => {
    // Initialize testing role from localStorage
    return localStorage.getItem('testingRole');
  });
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
      // Check if testing a client company role
      const testingCompanyType = localStorage.getItem('testingCompanyType');
      // Special handling for project_manager - they use the same role regardless of company type
      if (testingRole === 'project_manager') {
        return 'project_manager';
      }
      if (testingCompanyType === 'client') {
        return 'client_company_admin';
      }
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
    
    // Navigate to the appropriate dashboard based on the new role
    if (role === 'operations_director') {
      setLocation('/operations-dashboard');
    } else if (role === 'administrator') {
      setLocation('/admin-dashboard');
    } else if (role === 'project_manager') {
      setLocation('/dashboard');
    } else if (role === 'manager') {
      setLocation('/manager-dashboard');
    } else if (role === 'client_company_admin') {
      setLocation('/client-dashboard');
    } else {
      setLocation('/dashboard');
    }
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
              <DashboardRoute 
                user={user}
                getEffectiveRole={getEffectiveRole}
                handleRoleSwitch={handleRoleSwitch}
                testingRole={testingRole}
                permanentRole={permanentRole}
                setLocation={setLocation}
              />
            </Route>
            <Route path="/operations-dashboard">
              <OperationsDirectorDashboard />
            </Route>
            <Route path="/operations/companies">
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                <OperationsCompanies />
              </div>
            </Route>
            <Route path="/operations/active-admins">
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                <OperationsActiveAdmins />
              </div>
            </Route>

            <Route path="/operations/recent-setups">
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                <OperationsRecentSetups />
              </div>
            </Route>
            <Route path="/operations/exclusive-network">
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                <OperationsExclusiveNetwork />
              </div>
            </Route>
            <Route path="/admin-dashboard">
              <AdminDashboard />
            </Route>
            <Route path="/reports">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const hasAdminAccess = hasAnyRole(user as any, ['administrator', 'manager']) || ['administrator', 'manager'].includes(effectiveRole) || isOperationsDirector(user as any);
                const hasFieldAgentAccess = hasRole(user as any, 'field_agent') || effectiveRole === 'field_agent';
                
                if (hasAdminAccess) {
                  return (
                    <div>
                      {isOperationsDirector(user as any) && (
                        <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                      )}
                      <TeamReports />
                    </div>
                  );
                } else if (hasFieldAgentAccess) {
                  return (
                    <div>
                      {isOperationsDirector(user as any) && (
                        <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                      )}
                      <AgentDashboard />
                    </div>
                  );
                }
                return <Landing />;
              })()}
            </Route>
            <Route path="/reports/team">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const hasAdminAccess = hasAnyRole(user as any, ['administrator', 'manager']) || ['administrator', 'manager'].includes(effectiveRole) || isOperationsDirector(user as any);
                const hasFieldAgentAccess = hasRole(user as any, 'field_agent') || effectiveRole === 'field_agent';
                
                if (hasAdminAccess) {
                  return (
                    <div>
                      {isOperationsDirector(user as any) && (
                        <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                      )}
                      <TeamReports />
                    </div>
                  );
                } else if (hasFieldAgentAccess) {
                  return (
                    <div>
                      {isOperationsDirector(user as any) && (
                        <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                      )}
                      <AgentDashboard />
                    </div>
                  );
                }
                return <Landing />;
              })()}
            </Route>
            <Route path="/team">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const hasAdminAccess = hasAnyRole(user as any, ['administrator', 'manager']) || ['administrator', 'manager'].includes(effectiveRole);
                // Only allow Operations Directors superuser access when NOT role testing
                const isRoleTesting = !!testingRole || !!permanentRole;
                const isSuperUserAccess = isOperationsDirector(user as any) && !isRoleTesting;
                const hasFieldAgentAccess = hasRole(user as any, 'field_agent') || effectiveRole === 'field_agent';
                
                if (hasAdminAccess || isSuperUserAccess) {
                  return (
                    <div>
                      {isOperationsDirector(user as any) && (
                        <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                      )}
                      <TeamPage />
                    </div>
                  );
                } else if (hasFieldAgentAccess) {
                  return (
                    <div>
                      {isOperationsDirector(user as any) && (
                        <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                      )}
                      <AgentDashboard />
                    </div>
                  );
                }
                return <Landing />;
              })()}
            </Route>
            <Route path="/onboarding">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const hasAdminAccess = hasAnyRole(user as any, ['administrator', 'manager']) || ['administrator', 'manager'].includes(effectiveRole) || isOperationsDirector(user as any);
                const hasFieldAgentAccess = hasRole(user as any, 'field_agent') || effectiveRole === 'field_agent';
                
                if (hasAdminAccess) {
                  return (
                    <div>
                      {isOperationsDirector(user as any) && (
                        <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                      )}
                      <Onboarding />
                    </div>
                  );
                } else if (hasFieldAgentAccess) {
                  return (
                    <div>
                      {isOperationsDirector(user as any) && (
                        <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                      )}
                      <AgentDashboard />
                    </div>
                  );
                }
                return <Landing />;
              })()}
            </Route>
            <Route path="/mywork">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const hasFieldAgentAccess = hasRole(user as any, 'field_agent') || effectiveRole === 'field_agent' || isOperationsDirector(user as any);
                
                if (hasFieldAgentAccess) {
                  return (
                    <div>
                      {isOperationsDirector(user as any) && (
                        <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                      )}
                      <MyWork />
                    </div>
                  );
                }
                return <Landing />;
              })()}
            </Route>

            <Route path="/work-orders">
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                {isAuthenticated ? <WorkOrders /> : <Landing />}
              </div>
            </Route>

            <Route path="/job-network">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const hasJobNetworkAccess = ['administrator', 'manager', 'dispatcher', 'client_company_admin'].includes(effectiveRole);
                // Only allow Operations Directors superuser access when NOT role testing
                const isRoleTesting = !!testingRole || !!permanentRole;
                const isSuperUserAccess = isOperationsDirector(user as any) && !isRoleTesting;
                
                if (isAuthenticated && (hasJobNetworkAccess || isSuperUserAccess)) {
                  return (
                    <Suspense fallback={<div className="p-4">Loading job network...</div>}>
                      <JobNetwork 
                        user={user as any} 
                        testingRole={testingRole || undefined}
                        onRoleSwitch={handleRoleSwitch}
                      />
                    </Suspense>
                  );
                }
                return <Landing />;
              })()}
            </Route>

            <Route path="/talent-network">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const hasTalentNetworkAccess = ['operations_director', 'administrator', 'manager', 'dispatcher', 'client_company_admin'].includes(effectiveRole);
                // Only allow Operations Directors superuser access when NOT role testing
                const isRoleTesting = !!testingRole || !!permanentRole;
                const isSuperUserAccess = isOperationsDirector(user as any) && !isRoleTesting;
                
                if (isAuthenticated && (hasTalentNetworkAccess || isSuperUserAccess)) {
                  return (
                    <div>
                      <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                      <TalentNetworkPage />
                    </div>
                  );
                }
                return <Landing />;
              })()}
            </Route>

            <Route path="/project-network">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const hasProjectNetworkAccess = ['operations_director', 'administrator', 'project_manager', 'manager', 'field_engineer', 'client_company_admin'].includes(effectiveRole);
                // Only allow Operations Directors superuser access when NOT role testing
                const isRoleTesting = !!testingRole || !!permanentRole;
                const isSuperUserAccess = isOperationsDirector(user as any) && !isRoleTesting;
                
                if (isAuthenticated && (hasProjectNetworkAccess || isSuperUserAccess)) {
                  return (
                    <div>
                      <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                      <ProjectNetworkPage />
                    </div>
                  );
                }
                return <Landing />;
              })()}
            </Route>

            <Route path="/manager-dashboard">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const hasManagerAccess = ['operations_director', 'manager'].includes(effectiveRole);
                // Only allow Operations Directors superuser access when NOT role testing
                const isRoleTesting = !!testingRole || !!permanentRole;
                const isSuperUserAccess = isOperationsDirector(user as any) && !isRoleTesting;
                
                if (isAuthenticated && (hasManagerAccess || isSuperUserAccess)) {
                  return (
                    <div>
                      <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'manager'} />
                      <ManagerDashboard />
                    </div>
                  );
                }
                return <Landing />;
              })()}
            </Route>
            <Route path="/admin-dashboard">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const hasAdminAccess = ['operations_director', 'administrator'].includes(effectiveRole);
                // Only allow Operations Directors superuser access when NOT role testing
                const isRoleTesting = !!testingRole || !!permanentRole;
                const isSuperUserAccess = isOperationsDirector(user as any) && !isRoleTesting;
                
                if (isAuthenticated && (hasAdminAccess || isSuperUserAccess)) {
                  return (
                    <div>
                      <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'administrator'} />
                      <AdminDashboard />
                    </div>
                  );
                }
                return <Landing />;
              })()}
            </Route>

            <Route path="/messages">
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                {isAuthenticated ? <Messages /> : <Landing />}
              </div>
            </Route>
            <Route path="/calendar">
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                {isAuthenticated ? <Calendar /> : <Landing />}
              </div>
            </Route>
            <Route path="/time-tracking">
              <div>
                <RoleSwitcher currentRole={getEffectiveRole()} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                {isAuthenticated ? <TimeTracking /> : <Landing />}
              </div>
            </Route>
            <Route path="/client-dashboard">
              {(() => {
                const effectiveRole = getEffectiveRole();
                // Allow access if user has client role OR is testing as client OR is operations director
                const hasClientAccess = effectiveRole === 'client_company_admin' || isOperationsDirector(user as any);
                
                if (isAuthenticated && hasClientAccess) {
                  return (
                    <Suspense fallback={<div className="p-4">Loading client dashboard...</div>}>
                      <div>
                        {/* Navigation for client dashboard users */}
                        <Navigation 
                          testingRole={testingRole || undefined} 
                          currentActiveRole={permanentRole || getPrimaryRole(user as any)}
                          onPermanentRoleSwitch={(role) => {
                            localStorage.setItem('selectedRole', role);
                            window.location.reload();
                          }}
                        />
                        {isOperationsDirector(user as any) && (
                          <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                        )}
                        {(() => {
                          const ClientDashboard = React.lazy(() => import('@/pages/client-dashboard'));
                          return <ClientDashboard user={user as any} />;
                        })()}
                      </div>
                    </Suspense>
                  );
                }
                return <Landing />;
              })()}
            </Route>

            <Route path="/field-agent/my-work">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const isFieldAgent = hasRole(user as any, 'field_agent') || effectiveRole === 'field_agent';
                
                if (isAuthenticated && isFieldAgent) {
                  return (
                    <div>
                      {isOperationsDirector(user as any) && (
                        <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} currentActiveRole={permanentRole || 'operations_director'} />
                      )}
                      <FieldAgentWork />
                    </div>
                  );
                }
                return <Landing />;
              })()}
            </Route>
            <Route path="/field-agent/settings">
              {(() => {
                const effectiveRole = getEffectiveRole();
                const isFieldAgent = hasRole(user as any, 'field_agent') || effectiveRole === 'field_agent';
                
                if (isAuthenticated && isFieldAgent) {
                  return (
                    <div>
                      {isOperationsDirector(user as any) && (
                        <RoleSwitcher currentRole={effectiveRole} onRoleSwitch={handleRoleSwitch} />
                      )}
                      <FieldAgentSettings />
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
