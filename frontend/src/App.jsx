import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Sun, Moon } from 'lucide-react';
import './index.css';

const LogoLoader = ({ onComplete }) => {
  return (
    <motion.div
      className="loading-overlay"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="loader-brand"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        Vectr
      </motion.div>
    </motion.div>
  );
};

const MasonryTiles = () => {
  const tiles = [
    { id: 1, type: 'tile-2' }, { id: 2, type: 'tile-1' }, { id: 3, type: 'tile-1' },
    { id: 4, type: 'tile-1' }, { id: 5, type: 'tile-2' }, { id: 6, type: 'tile-1' },
    { id: 7, type: 'tile-2' }, { id: 8, type: 'tile-1' }, { id: 9, type: 'tile-1' },
    { id: 10, type: 'tile-1' }, { id: 11, type: 'tile-2' }, { id: 12, type: 'tile-1' },
  ];

  return (
    <motion.div
      className="masonry-grid"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
      }}
      initial="hidden"
      animate="visible"
    >
      {tiles.map((tile) => (
        <motion.div
          key={tile.id}
          className={`tile ${tile.type}`}
          variants={{
            hidden: { opacity: 0, scale: 0.8 },
            visible: { opacity: 1, scale: 1 }
          }}
          whileHover={{ scale: 1.02, y: -5 }}
        />
      ))}
    </motion.div>
  );
};

const ThemeToggle = ({ theme, toggleTheme }) => (
  <motion.button
    className="theme-toggle"
    onClick={toggleTheme}
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.5 }}
    whileHover={{ opacity: 1, rotate: 15 }}
  >
    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
  </motion.button>
);

const AuthLayout = ({ children, theme, toggleTheme }) => (
  <div className="auth-container">
    <div className="masonry-side">
      <MasonryTiles />
    </div>
    <div className="form-side">
      <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      <motion.div
        className="brand-wrapper"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <h1 className="brand-logo">Vectr</h1>
      </motion.div>
      <div className="auth-form-wrapper">
        {children}
      </div>
    </div>
  </div>
);

const formVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      staggerChildren: 0.1,
      delayChildren: 0.6
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

import { loginWithGoogleFirebase } from './firebase';

const Login = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      console.log("🔵 Google Login Clicked!");
      const { user, idToken } = await loginWithGoogleFirebase();
      console.log("✅ Firebase popup successful!", user.email);

      const response = await fetch("http://localhost:8000/user/google-login", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (response.ok) {
        console.log("✅ Logged in to backend:", data);
        localStorage.setItem("userEmail", data.email);
        alert(`Success! Logged in as ${data.email}`);
        navigate("/dashboard");
      } else {
        console.error("❌ Backend login failed:", data.detail);
        alert("Backend Login Failed: " + data.detail);
      }
    } catch (error) {
      console.error("❌ Google Login Error:", error);
      alert("Google Sign-In Error: " + error.message);
    }
  };

  return (
    <AuthLayout theme={theme} toggleTheme={toggleTheme}>
      <motion.form
        className="auth-form"
        variants={formVariants}
        initial="hidden"
        animate="visible"
        onSubmit={(e) => e.preventDefault()}
      >
        <motion.div className="form-group" variants={itemVariants}>
          <label className="input-label">Email</label>
          <input type="email" placeholder="name@example.com" className="input-field" required />
        </motion.div>

        <motion.div className="form-group" variants={itemVariants}>
          <label className="input-label">Password</label>
          <input type="password" placeholder="••••••••" className="input-field" required />
          <a href="#" className="forgot-link">Forgot password?</a>
        </motion.div>

        <motion.button
          type="submit"
          className="submit-btn"
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          Sign In
        </motion.button>

        <motion.div className="divider" style={{ textAlign: 'center', margin: '1rem 0' }} variants={itemVariants}>
          <span>or</span>
        </motion.div>

        <motion.button
          type="button"
          className="google-btn"
          onClick={handleGoogleLogin}
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-main)',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Continue with Google
        </motion.button>

        <motion.div className="switch-auth" variants={itemVariants}>
          Don't have an account? <Link to="/signup">Create account</Link>
        </motion.div>
      </motion.form>
    </AuthLayout>
  );
};

const Signup = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      console.log("🔵 Google Signup Clicked!");
      const { user, idToken } = await loginWithGoogleFirebase();
      console.log("✅ Firebase popup successful!", user.email);

      const response = await fetch("http://localhost:8000/user/google-login", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (response.ok) {
        console.log("✅ Logged in/Signed up via backend:", data);
        localStorage.setItem("userEmail", data.email);
        alert(`Success! Account linked as ${data.email}`);
        navigate("/dashboard");
      } else {
        console.error("❌ Backend signup failed:", data.detail);
        alert("Backend Signup Failed: " + data.detail);
      }
    } catch (error) {
      console.error("❌ Google Signup Error:", error);
      alert("Google Sign-Up Error: " + error.message);
    }
  };

  return (
    <AuthLayout theme={theme} toggleTheme={toggleTheme}>
      <motion.form
        className="auth-form"
        variants={formVariants}
        initial="hidden"
        animate="visible"
        onSubmit={(e) => e.preventDefault()}
      >
        <motion.div className="form-group" variants={itemVariants}>
          <label className="input-label">Full Name</label>
          <input type="text" placeholder="John Doe" className="input-field" required />
        </motion.div>

        <motion.div className="form-group" variants={itemVariants}>
          <label className="input-label">Email</label>
          <input type="email" placeholder="name@example.com" className="input-field" required />
        </motion.div>

        <motion.div className="form-group" variants={itemVariants}>
          <label className="input-label">Password</label>
          <input type="password" placeholder="••••••••" className="input-field" required />
        </motion.div>

        <motion.button
          type="submit"
          className="submit-btn"
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          Create Account
        </motion.button>

        <motion.div className="divider" style={{ textAlign: 'center', margin: '1rem 0' }} variants={itemVariants}>
          <span>or</span>
        </motion.div>

        <motion.button
          type="button"
          className="google-btn"
          onClick={handleGoogleLogin}
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-main)',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Sign up with Google
        </motion.button>

        <motion.div className="switch-auth" variants={itemVariants}>
          Already have an account? <Link to="/login">Sign in</Link>
        </motion.div>
      </motion.form>
    </AuthLayout>
  );
};

function App() {
  const [theme, setTheme] = useState('dark');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <GoogleOAuthProvider clientId="MOCK_ID">
      <AnimatePresence mode="wait">
        {loading ? (
          <LogoLoader key="loader" />
        ) : (
          <Router>
            <Routes>
              <Route path="/login" element={<Login theme={theme} toggleTheme={toggleTheme} />} />
              <Route path="/signup" element={<Signup theme={theme} toggleTheme={toggleTheme} />} />
              <Route path="/" element={<Login theme={theme} toggleTheme={toggleTheme} />} />
            </Routes>
          </Router>
        )}
      </AnimatePresence>
    </GoogleOAuthProvider>
  );
}

export default App;
