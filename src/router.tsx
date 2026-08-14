import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout/AppLayout';
import { PermissionGuard } from './components/PermissionGuard';
import { ChatAccessGuard } from './components/ChatAccessGuard';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Home from './pages/Home/Home';
import Dashboard from './pages/Dashboard/Dashboard';
import DirectorDashboard from './pages/DirectorDashboard/DirectorDashboard';
import Startups from './pages/Startups/Startups';
import StartupDetail from './pages/StartupDetail/StartupDetail';
import Article from './pages/Article/Article';
import AIAssistant from './pages/AIAssistant/AIAssistant';
import Settings from './pages/Settings/Settings';
import Team from './pages/Team/Team';
import { MyProgressPage } from './pages/MyProgress/MyProgressPage';
import InvestorApplications from './pages/InvestorApplications/InvestorApplications';
import Portfolio from './pages/Portfolio/Portfolio';
import InvestmentCommittee from './pages/InvestmentCommittee/InvestmentCommittee';
import CommitteeVotingFlow from './pages/InvestmentCommittee/CommitteeVotingFlow';
import Chats from './pages/Chats/Chats';
import { StartupCabinetLogin } from './pages/StartupCabinet/StartupCabinetLogin';
import { StartupCabinetLayout } from './pages/StartupCabinet/StartupCabinetLayout';
import { StartupCabinetDashboard } from './pages/StartupCabinet/StartupCabinetDashboard';
import { StartupCabinetReports } from './pages/StartupCabinet/StartupCabinetReports';
import { RemoteSignaturePage } from './pages/RemoteSignature/RemoteSignaturePage';

function LegacyCommitteeMeetingRedirect() {
  const { meetingId } = useParams<{ meetingId: string }>();
  return <Navigate to={`/committee/sessions/${meetingId}`} replace />;
}

export const router = createBrowserRouter([
  {
    path: '/cabinet/login',
    element: <StartupCabinetLogin />,
  },
  {
    path: '/cabinet',
    element: <StartupCabinetLayout />,
    children: [
      {
        index: true,
        element: <StartupCabinetDashboard />,
      },
      {
        path: 'edit',
        element: <StartupCabinetDashboard />,
      },
      {
        path: 'reports',
        element: <StartupCabinetReports />,
      },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/remote-sign/:token',
    element: <RemoteSignaturePage />,
  },
  {
    path: '/investment-committee/sign/:token',
    element: <RemoteSignaturePage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'home',
        element: <Home />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'director',
        element: <DirectorDashboard />,
      },
      {
        path: 'startups',
        element: <Startups />,
      },
      {
        path: 'startups/:id',
        element: <StartupDetail />,
      },
      {
        path: 'portfolio',
        element: <Navigate to="/portfolio/dashboard" replace />,
      },
      {
        path: 'portfolio/dashbaord',
        element: <Navigate to="/portfolio/dashboard" replace />,
      },
      {
        path: 'portfolio/dashboard',
        element: <Portfolio />,
      },
      {
        path: 'portfolio/startup-card',
        element: <Portfolio />,
      },
      {
        path: 'portfolio/cap-table',
        element: <Portfolio />,
      },
      {
        path: 'portfolio/traction',
        element: <Portfolio />,
      },
      {
        path: 'portfolio/settings',
        element: <Portfolio />,
      },
      {
        path: 'portfolio/:id',
        element: <StartupDetail />,
      },
      {
        path: 'investment-committee',
        element: <InvestmentCommittee />,
      },
      {
        path: 'committee',
        element: <Navigate to="/committee/sessions" replace />,
      },
      {
        path: 'committee/sessions',
        element: <InvestmentCommittee />,
      },
      {
        path: 'committee/sessions/:meetingId',
        element: <InvestmentCommittee />,
      },
      {
        path: 'committee/sessions/:meetingId/vote',
        element: <CommitteeVotingFlow />,
      },
      {
        path: 'committee/sessions/:meetingId/projects/:id',
        element: <StartupDetail />,
      },
      {
        path: 'committee/meetings',
        element: <Navigate to="/committee/sessions" replace />,
      },
      {
        path: 'committee/meetings/:meetingId',
        element: <LegacyCommitteeMeetingRedirect />,
      },
      {
        path: 'committee/*',
        element: <InvestmentCommittee />,
      },
      {
        path: 'investor-applications',
        element: <InvestorApplications />,
      },
      {
        path: 'chats',
        element: (
          <ChatAccessGuard>
            <Chats />
          </ChatAccessGuard>
        ),
      },
      {
        path: 'chats/:id',
        element: (
          <ChatAccessGuard>
            <Chats />
          </ChatAccessGuard>
        ),
      },
      {
        path: 'article/:id',
        element: <Article />,
      },
      {
        path: 'news/:id',
        element: <Article />,
      },
      {
        path: 'my-progress',
        element: <MyProgressPage />,
      },
      {
        path: 'imports',
        element: <Navigate to="/portfolio/dashboard" replace />,
      },
      {
        path: 'ai-assistant',
        element: <AIAssistant />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
]);
