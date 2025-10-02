import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ApiProvider } from './contexts/ApiContext';
// import { AuthProvider } from './contexts/AuthContext'; // COMMENTED OUT - No admin auth needed for ICS
// import ProtectedRoute from './components/Auth/ProtectedRoute'; // COMMENTED OUT - No auth protection needed for ICS
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Collections from './pages/Collections';
import Images from './pages/Images';
import Generate from './pages/Generate';
import Progress from './pages/Progress';
import Settings from './pages/Settings';
import ManageCategory from './pages/ManageCategory';
// Admin pages commented out - not needed for ICS functionality
// import AdminCategories from './pages/AdminCategories';
// import AdminItems from './pages/AdminItems';
// import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    // <AuthProvider> // COMMENTED OUT - No admin auth needed for ICS
      <ApiProvider>
        <Router>
          {/* <ProtectedRoute> */} {/* COMMENTED OUT - No auth protection needed for ICS */}
            <Layout>
              <Routes>
                <Route path="/" element={<Collections />} /> {/* Default to Collections page for ICS */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/collections" element={<Collections />} />
                <Route path="/images" element={<Images />} />
                <Route path="/generate" element={<Generate />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/manage-category" element={<ManageCategory />} />
                <Route path="/settings" element={<Settings />} />
                {/* Admin routes commented out - not needed for ICS
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/categories" element={<AdminCategories />} />
                <Route path="/admin/items" element={<AdminItems />} />
                */}
              </Routes>
            </Layout>
          {/* </ProtectedRoute> */}
        </Router>
      </ApiProvider>
    // </AuthProvider>
  );
}

export default App;