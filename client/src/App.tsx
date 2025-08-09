import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { hasRole, hasAnyRole, isOperationsDirector } from "../../shared/schema";
import Landing from "@/pages/landing";
import OperationsDirectorDashboard from "@/pages/operations-director-dashboard";
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

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();
  


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
            <Route path="/dashboard">
              {(() => {
                const selectedRole = localStorage.getItem('selectedRole');
                const hasOpsDirector = isOperationsDirector(user as any);
                const hasAdmin = hasRole(user as any, 'administrator');
                
                // If user has both operations director and admin roles, show role selection unless they've chosen
                if (hasOpsDirector && hasAdmin && !selectedRole) {
                  return <RoleSelection user={user} />;
                }
                
                // If user has selected a role, use that
                if (selectedRole === 'operations_director' && hasOpsDirector) {
                  return <OperationsDirectorDashboard />;
                }
                if (selectedRole === 'administrator' && hasAdmin) {
                  return <AdminDashboard />;
                }
                
                // Default role-based routing
                if (hasOpsDirector) {
                  return <OperationsDirectorDashboard />;
                } else if (hasAdmin) {
                  return <AdminDashboard />;
                } else if (hasRole(user as any, 'manager')) {
                  return <ManagerDashboard />;
                } else if (hasRole(user as any, 'field_agent')) {
                  return <AgentDashboard />;
                } else {
                  return <Landing />;
                }
              })()}
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
            <Route path="/time-tracking">
              {isAuthenticated ? <TimeTracking /> : <Landing />}
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
