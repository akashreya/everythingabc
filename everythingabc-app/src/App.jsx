import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Star,
  Search,
  Play,
  BookOpen,
  Users,
  Trophy,
  Moon,
  Sun,
  Loader2,
} from "lucide-react";
import apiService from "./services/api.js";
import Breadcrumb from "./components/Breadcrumb.jsx";
import { getImageUrl } from "./utils/imageUtils.js";
import FlippingGridBackground from "./components/FlippingGridBackground.jsx";
import { useTheme } from './contexts/ThemeContext.jsx';

// Import new components
import AppHeader from './components/AppHeader.jsx';
import HeroSection from './components/HeroSection.jsx';
import CategoriesSection from './components/CategoriesSection.jsx';
import AppFooter from './components/AppFooter.jsx';


function App() {
  // Dark mode state is now managed by ThemeProvider, consumed via useTheme hook
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <HeroSection />
      <CategoriesSection />
      <AppFooter />
    </div>
  );
}

export default App;