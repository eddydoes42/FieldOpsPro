import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { hasRole, hasAnyRole } from "../../shared/schema";
import Landing from "@/pages/landing";
import AdminDashboard from "@/pages/admin-dashboard";
import ManagerDashboard from "@/pages/manager-dashboard";
import AgentDashboard from "@/pages/agent-dashboard";
import TeamReports from "@/pages/team-reports";
import TeamPage from "@/pages/team";
import Onboarding from "@/pages/onboarding";
import WorkOrders from "@/pages/work-orders";
import Messages from "@/pages/messages";
import Calendar from "@/pages/calendar";
import NotFound from "@/pages/not-found";
import FloatingQuickAction from "@/components/floating-quick-action";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

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
              {() => {
                if (hasRole(user as any, 'administrator')) {
                  return <AdminDashboard />;
                } else if (hasRole(user as any, 'manager')) {
                  return <ManagerDashboard />;
                } else if (hasRole(user as any, 'field_agent')) {
                  return <AgentDashboard />;
                } else {
                  return <Landing />;
                }
              }}
            </Route>
            <Route path="/reports">
              {() => {
                if (hasAnyRole(user as any, ['administrator', 'manager'])) {
                  return <TeamReports />;
                } else if (hasRole(user as any, 'field_agent')) {
                  return <AgentDashboard />;
                } else {
                  return <Landing />;
                }
              }}
            </Route>
            <Route path="/reports/team">
              {() => {
                if (hasAnyRole(user as any, ['administrator', 'manager'])) {
                  return <TeamReports />;
                } else if (hasRole(user as any, 'field_agent')) {
                  return <AgentDashboard />;
                } else {
                  return <Landing />;
                }
              }}
            </Route>
            <Route path="/team">
              {() => {
                if (hasAnyRole(user as any, ['administrator', 'manager'])) {
                  return <TeamPage />;
                } else if (hasRole(user as any, 'field_agent')) {
                  return <AgentDashboard />;
                } else {
                  return <Landing />;
                }
              }}
            </Route>
            <Route path="/onboarding">
              {() => {
                if (hasAnyRole(user as any, ['administrator', 'manager'])) {
                  return <Onboarding />;
                } else if (hasRole(user as any, 'field_agent')) {
                  return <AgentDashboard />;
                } else {
                  return <Landing />;
                }
              }}
            </Route>
            <Route path="/work-orders">
              {isAuthenticated && <WorkOrders />}
              {!isAuthenticated && <Landing />}
            </Route>
            <Route path="/messages">
              {isAuthenticated && <Messages />}
              {!isAuthenticated && <Landing />}
            </Route>
            <Route path="/calendar">
              {isAuthenticated && <Calendar />}
              {!isAuthenticated && <Landing />}
            </Route>
        </>
      )}
      <Route component={NotFound} />
      </Switch>
      
      {/* Global Floating Quick Action Button */}
      {isAuthenticated && <FloatingQuickAction />}
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
