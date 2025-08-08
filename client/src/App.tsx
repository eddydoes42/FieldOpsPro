import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import AdminDashboard from "@/pages/admin-dashboard";
import ManagerDashboard from "@/pages/manager-dashboard";
import AgentDashboard from "@/pages/agent-dashboard";
import TeamReports from "@/pages/team-reports";
import TeamPage from "@/pages/team";
import Onboarding from "@/pages/onboarding";
import WorkOrders from "@/pages/work-orders";
import Messages from "@/pages/messages";
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
              {(user as any)?.role === 'administrator' && <AdminDashboard />}
              {(user as any)?.role === 'manager' && <ManagerDashboard />}
              {(user as any)?.role === 'field_agent' && <AgentDashboard />}
              {!(user as any)?.role && <Landing />}
            </Route>
            <Route path="/reports">
              {((user as any)?.role === 'administrator' || (user as any)?.role === 'manager') && <TeamReports />}
              {(user as any)?.role === 'field_agent' && <AgentDashboard />}
              {!(user as any)?.role && <Landing />}
            </Route>
            <Route path="/reports/team">
              {((user as any)?.role === 'administrator' || (user as any)?.role === 'manager') && <TeamReports />}
              {(user as any)?.role === 'field_agent' && <AgentDashboard />}
              {!(user as any)?.role && <Landing />}
            </Route>
            <Route path="/team">
              {((user as any)?.role === 'administrator' || (user as any)?.role === 'manager') && <TeamPage />}
              {(user as any)?.role === 'field_agent' && <AgentDashboard />}
              {!(user as any)?.role && <Landing />}
            </Route>
            <Route path="/onboarding">
              {((user as any)?.role === 'administrator' || (user as any)?.role === 'manager') && <Onboarding />}
              {(user as any)?.role === 'field_agent' && <AgentDashboard />}
              {!(user as any)?.role && <Landing />}
            </Route>
            <Route path="/work-orders">
              {isAuthenticated && <WorkOrders />}
              {!isAuthenticated && <Landing />}
            </Route>
            <Route path="/messages">
              {isAuthenticated && <Messages />}
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
