import React, { Suspense } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes.jsx';
import Spinner from './components/Common/Spinner';

function App() {
  return (
    <Suspense fallback={<Spinner fullPage />}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster position="top-center" reverseOrder={false} />
      </AuthProvider>
    </Suspense>
  );
}
export default App;
