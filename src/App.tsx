import { RouterProvider } from 'react-router-dom';
import { GlobalStyles } from './styles/GlobalStyles';
import { router } from './router';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeModeProvider } from './contexts/ThemeModeContext';
import { ToastProvider } from './components/ui/Toast';
import { DocPreviewHost } from './components/ui/DocPreview/DocPreview';

function App() {
  return (
    <AuthProvider>
      <ThemeModeProvider>
        <GlobalStyles />
        <ToastProvider>
          <RouterProvider router={router} />
          <DocPreviewHost />
        </ToastProvider>
      </ThemeModeProvider>
    </AuthProvider>
  );
}

export default App;
