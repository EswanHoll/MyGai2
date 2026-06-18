import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import GekkoLayout from "./components/GekkoLayout";
import Overview from "./pages/Overview";
import DailyBrief from "./pages/DailyBrief";
import TaskDashboard from "./pages/TaskDashboard";
import PublishQueue from "./pages/PublishQueue";

function Router() {
  return (
    <GekkoLayout>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/brief" component={DailyBrief} />
        <Route path="/tasks" component={TaskDashboard} />
        <Route path="/publish" component={PublishQueue} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </GekkoLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors theme="dark" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
