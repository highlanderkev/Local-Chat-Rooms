import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { AuthProvider } from './lib/auth';
import { LocationProvider } from './lib/location';
import { MobileLayout } from './components/layout';

import OnboardingPage from './pages/onboarding';
import RoomsPage from './pages/rooms';
import TrendingPage from './pages/trending';
import CreateRoomPage from './pages/create-room';
import ChatPage from './pages/chat';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={OnboardingPage} />
      <Route path="/rooms" component={RoomsPage} />
      <Route path="/rooms/create" component={CreateRoomPage} />
      <Route path="/rooms/:id" component={ChatPage} />
      <Route path="/trending" component={TrendingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <LocationProvider>
            <MobileLayout>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
                <Router />
              </WouterRouter>
            </MobileLayout>
            <Toaster />
          </LocationProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
