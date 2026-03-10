import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleOAuthProvider } from '@react-oauth/google';
import {
  Sun, Moon, Search, Send, Plus, ChevronLeft, ChevronDown, Bell, MessageSquare,
  Home, Layout, Settings, User, Power, PanelLeft, Github, HelpCircle, LogOut, X, Activity
} from 'lucide-react';
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
          "Authorization": `Bearer ${idToken} `,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (response.ok) {
        console.log("✅ Logged in to backend:", data);
        localStorage.setItem("userEmail", data.email);
        alert(`Success! Logged in as ${data.email} `);
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
        onSubmit={handleSignup}
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

const GithubPAT = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();

  return (
    <div className="pat-container">
      <motion.div
        className="pat-logo"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4L4 8L12 12L20 8L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 12L12 16L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16L12 20L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        vectr
      </motion.div>

      <motion.div
        className="pat-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="pat-header">
          <h2 className="pat-title">Github PAT</h2>
          <div className="pat-instructions">
            Ordered-list-wise step-by-step instructions to get Github PAT
            <ol>
              <li>Go to GitHub Settings {">"} Developer settings</li>
              <li>Select Personal access tokens {">"} Tokens (classic)</li>
              <li>Generate new token and copy it here</li>
            </ol>
          </div>
        </div>

        <div className="pat-input-wrapper">
          <input
            type="text"
            placeholder="Enter PAT here ..."
            className="pat-input"
          />
        </div>

        <div className="pat-actions">
          <motion.button
            className="pat-done-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/level-selection")}
          >
            Done
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

const LevelSelection = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();
  const [selectedLevel, setSelectedLevel] = useState('Beginner');

  const levels = ['Beginner', 'Intermediatet', 'Expert'];

  return (
    <div className="level-container">
      <motion.div
        className="pat-logo"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4L4 8L12 12L20 8L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 12L12 16L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16L12 20L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        vectr
      </motion.div>

      <motion.div
        className="level-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="level-title">Level Selection</h2>

        <div className="level-options">
          {levels.map((level) => (
            <button
              key={level}
              className={`level-btn ${selectedLevel === level ? 'active' : ''}`}
              onClick={() => setSelectedLevel(level)}
            >
              {level}
            </button>
          ))}
        </div>

        <motion.button
          className="level-done-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/dashboard")}
        >
          Done
        </motion.button>
      </motion.div>
    </div>
  );
};

const Sidebar = ({ activeItem }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard', path: '/dashboard' },
    { id: 'explorer', icon: Layout, label: 'Explorer', path: '/explorer' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
    { id: 'profile', icon: User, label: 'Profile', path: '#' },
  ];

  return (
    <motion.aside
      className={`sidebar ${isExpanded ? 'expanded' : ''}`}
      onHoverStart={() => setIsExpanded(true)}
      onHoverEnd={() => setIsExpanded(false)}
      initial={false}
      animate={{ width: isExpanded ? 260 : 80 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="sidebar-logo" style={{ padding: '0 1.5rem', marginBottom: '2.5rem', color: 'var(--accent-primary)', fontWeight: 800, fontSize: '1.5rem', height: '60px', display: 'flex', alignItems: 'center' }}>
        {isExpanded ? 'vectr' : 'v.'}
      </div>

      <div className="sidebar-menu" style={{ flex: 1 }}>
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            style={{ position: 'relative' }}
          >
            <item.icon size={22} style={{ minWidth: '22px' }} />
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  className="sidebar-label"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
        <div className="sidebar-item">
          <HelpCircle size={22} style={{ minWidth: '22px' }} />
          {isExpanded && <span className="sidebar-label">Support</span>}
        </div>
        <div className="sidebar-item" onClick={() => navigate('/login')}>
          <LogOut size={22} style={{ minWidth: '22px' }} />
          {isExpanded && <span className="sidebar-label">Logout</span>}
        </div>
      </div>
    </motion.aside>
  );
};

const SettingsPage = () => {
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState(true);
  const [highContrast, setHighContrast] = useState(false);

  return (
    <div className="resolution-container">
      <Sidebar activeItem="settings" />
      <main className="main-content" style={{ flex: 1, padding: '2rem 4rem', overflowY: 'auto' }}>
        <header className="dashboard-header" style={{ marginBottom: '3rem' }}>
          <div className="user-info">
            <h1 className="resolution-title" style={{ fontSize: '2.5rem' }}>Settings</h1>
          </div>
        </header>

        <div className="settings-container">
          <motion.section
            className="settings-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="settings-title">Appearance</h3>
            <div className="setting-row">
              <div className="setting-info">
                <h4>Dark Mode</h4>
                <p>Use a dark theme for the interface.</p>
              </div>
              <div
                className={`toggle-switch ${theme === 'dark' ? 'on' : ''}`}
                onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              />
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <h4>High Contrast</h4>
                <p>Increase readability with higher contrast colors.</p>
              </div>
              <div
                className={`toggle-switch ${highContrast ? 'on' : ''}`}
                onClick={() => setHighContrast(!highContrast)}
              />
            </div>
          </motion.section>

          <motion.section
            className="settings-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="settings-title">Notifications</h3>
            <div className="setting-row">
              <div className="setting-info">
                <h4>Push Notifications</h4>
                <p>Receive updates about your contributions.</p>
              </div>
              <div
                className={`toggle-switch ${notifications ? 'on' : ''}`}
                onClick={() => setNotifications(!notifications)}
              />
            </div>
          </motion.section>

          <motion.section
            className="settings-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="settings-title">Developer Settings</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Manage your GitHub Personal Access Token and API preferences.
            </p>
            <button className="start-btn" style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              Manage GitHub PAT
            </button>
          </motion.section>
        </div>
      </main>
    </div>
  );
};

const NovaChatbot = ({ onClose }) => {
  const [messages, setMessages] = useState([
    { type: 'ai', text: "Hello! I'm Nova. How can I help you resolve this issue today?" },
    { type: 'user', text: "Can you explain this issue's complexity?" },
    { type: 'ai', text: "Based on the codebase, this issue involves refactoring the state management which is considered Intermediate complexity." }
  ]);
  const [input, setInput] = useState('');

  return (
    <motion.aside
      className="nova-sidebar"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div className="nova-chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Ask Nova!</span>
        {onClose && <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>}
      </div>
      <div className="chat-history">

        {messages.map((m, i) => (
          <div key={i} className={`chat - bubble ${m.type} `}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="chat-input-area">
        <div className="chat-input-pill">
          <Plus size={18} className="chat-action-btn" />
          <input
            type="text"
            placeholder="Ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Send size={18} className="chat-action-btn" />
        </div>
      </div>
    </motion.aside>
  );
};

const Explorer = ({ theme, toggleTheme, onToggleNova }) => {
  const navigate = useNavigate();
  const [showOrgModal, setShowOrgModal] = useState(true);
  const [showLangModal, setShowLangModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  const orgs = [
    { name: "Google OSS", count: 142, desc: "Cloud & Devtools" },
    { name: "Meta OpenSource", count: 89, desc: "Reactive UI & Infra" },
    { name: "Microsoft", count: 215, desc: "Developer Ecosystem" }
  ];

  const handleOrgSelect = (org) => {
    setSelectedOrg(org.name);
    setShowOrgModal(false);
  };

  const repos = ["TensorFlow", "React", "VS Code", "Node.js", "Kubernetes", "Next.js", "Docker", "Go"];
  const issues = ["Support for Async Context", "Memory leak in Render module", "Update CSS parser for Level 5", "Optimize cold start times"];
  const languages = ["C++", "C", "Go", "Java", "Typescript", "Python", "Rust", "Swift"];

  return (
    <div className="resolution-container">
      <Sidebar activeItem="explorer" />
      <main className="resolution-main">
        <header className="resolution-header">
          <div className="issue-info-h">
            <button className="back-btn" onClick={() => navigate("/dashboard")}><ChevronLeft size={20} /></button>
            <h1 className="resolution-title">
              {selectedOrg || "Organization"}
              <ChevronDown size={16} onClick={() => setShowOrgModal(true)} style={{ cursor: 'pointer', marginLeft: '8px' }} />
            </h1>
            <div className="badge-row">
              <span className="level-badge">{selectedOrg ? "Sector Active" : "Beginner"}</span>
            </div>
          </div>
          <Bell size={20} className="chat-action-btn" onClick={onToggleNova} style={{ cursor: 'pointer' }} />
        </header>

        <div className="explorer-grid">
          <div className="explorer-card">
            <div className="explorer-card-header">
              <span>{selectedOrg ? `${selectedOrg} Repositories` : 'Top Starred Repositories'}</span>
              <span className="issue-count">{repos.length}</span>
            </div>
            <div className="explorer-card-content">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {repos.map((r, i) => (
                  <div key={i} className={`repo-pill ${i === 0 ? 'active' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.05rem', color: i === 0 ? '#c7d2fe' : 'var(--text-primary)' }}>{r}</span>
                      {i === 0 && <ChevronLeft size={16} color="var(--accent-primary)" style={{ transform: 'rotate(180deg)' }} />}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'flex', gap: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#fbbf24' }}>★</span> {Math.floor(Math.random() * 10000) + 1000}
                      </span>
                      <span>{languages[Math.floor(Math.random() * languages.length)]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="explorer-card">
            <div className="explorer-card-header">
              <span>Mission Briefings</span>
              <span className="issue-count">{issues.length}</span>
            </div>
            <div className="explorer-card-content" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {issues.map((iss, i) => (
                  <div key={i} className={`org-item ${i === 0 ? 'active' : ''}`} onClick={() => { /* setSelectedIssue(issue.id) */ }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.4' }}>{iss}</span>
                    </div>
                    <button className="start-btn" onClick={(e) => { e.stopPropagation(); setShowLangModal(true); }} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                      Initiate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showOrgModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="elite-selection-container">
              <h2 className="elite-selection-title">CHOOSE YOUR SECTOR</h2>
              <div className="elite-selection-grid">
                {orgs.map((o, i) => (
                  <motion.div
                    key={i}
                    className="elite-selection-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handleOrgSelect(o)}
                  >
                    <h3>{o.name}</h3>
                    <p className="desc">{o.desc}</p>
                    <div style={{ marginTop: '1.5rem', color: 'var(--accent-primary)', fontWeight: 700 }}>{o.count} MISSIONS</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLangModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="elite-selection-container">
              <h2 className="elite-selection-title">CHOOSE YOUR WEAPON</h2>
              <div className="elite-selection-grid">
                {languages.slice(0, 8).map((l, i) => (
                  <motion.div
                    key={i}
                    className="elite-selection-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => navigate("/issue-navigator")}
                    style={{ padding: '1.5rem' }}
                  >
                    <h3>{l}</h3>
                  </motion.div>
                ))}
              </div>
              <button
                className="cancel-btn"
                onClick={() => setShowLangModal(false)}
                style={{ marginTop: '3rem', background: 'transparent', border: '1px solid var(--border)', color: '#fff' }}
              >
                Return to Command
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
};

const IssueNavigator = ({ theme, toggleTheme, onToggleNova }) => {
  const navigate = useNavigate();
  return (
    <div className="resolution-container">
      <Sidebar activeItem="explorer" />
      <main className="resolution-main">
        <header className="resolution-header">
          <div className="issue-info-h">
            <button className="back-btn" onClick={() => navigate("/explorer")}><ChevronLeft size={20} /></button>
            <h1 className="resolution-title">Issue Title</h1>
            <div className="badge-row">
              <span className="level-badge">Begginner</span>
              <span className="status-badge working" style={{ fontSize: '0.7rem' }}>C</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Bell size={20} className="chat-action-btn" onClick={onToggleNova} style={{ cursor: 'pointer' }} />
            <button className="draft-pr-btn" onClick={() => navigate("/pr-status")}>Draft PR</button>
          </div>
        </header>

        <div className="resolution-grid-4">
          <section className="panel">
            <div className="panel-header">Commits <Plus size={16} /></div>
            <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
                <span style={{ color: 'var(--text-muted)' }}>10:45 AM</span>
                <span>Initial setup</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }}></div>
                <span style={{ color: 'var(--text-muted)' }}>11:20 AM</span>
                <span>Refactor rendering</span>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">Issue Summary</div>
            <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#2dd4bf', margin: 0 }}>Bug: Memory Leak in React 18 Concurrent Render</h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.6', flex: 1 }}>
                When using transitions extensively, specifically `startTransition` wrapping large array mutations, memory usage slowly creeps up over time. It appears the Fiber tree is not properly clearing detached nodes.
              </p>
              <div style={{ padding: '1rem', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.85rem', borderLeft: '3px solid #f87171', background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ color: '#94a3b8' }}>Expected:</span> Heap stabilizes at ~50MB.<br />
                <span style={{ color: '#94a3b8' }}>Actual:</span> Heap grows unbounded ~2MB/sec.
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">Git Helper Commands</div>
            <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
              <div style={{ padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)', fontFamily: 'monospace', fontSize: '0.85rem', color: '#a5b4fc' }}>
                git checkout -b fix/memo-leak
              </div>
              <div style={{ padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '3px solid var(--success)', fontFamily: 'monospace', fontSize: '0.85rem', color: '#86efac' }}>
                git commit -m "fix: resolve concurrent fiber detachment"
              </div>
              <div style={{ padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '3px solid var(--warning)', fontFamily: 'monospace', fontSize: '0.85rem', color: '#fde047' }}>
                git push origin fix/memo-leak
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">Final Approach</div>
            <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
              <textarea
                placeholder="Document your fix implementation here..."
                style={{ width: '100%', flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', resize: 'none', fontFamily: 'inherit', fontSize: '0.95rem', outline: 'none' }}
                defaultValue="I isolated the memory leak to the `commitDeletion` phase inside ReactFiberCommitWork.js. By ensuring that `node.alternate` is also nulled out during unmount, the GC can successfully sweep the detached subtree."
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button className="start-btn" style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}>Save Approach</button>
              </div>
            </div>
          </section>

          <div style={{ gridColumn: '1 / 2', marginTop: '-0.8rem' }}>
            <section className="panel" style={{ height: '200px' }}>
              <div className="panel-header">Test Results</div>
              <div className="panel-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)' }}>142</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Passing</div>
                  </div>
                  <div style={{ height: '50px', width: '1px', background: 'var(--border)' }}></div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>0</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Failing</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

const PRStatus = ({ theme, toggleTheme, onToggleNova }) => {
  const navigate = useNavigate();
  return (
    <div className="resolution-container">
      <Sidebar activeItem="explorer" />
      <main className="resolution-main">
        <header className="resolution-header">
          <div className="issue-info-h">
            <button className="back-btn" onClick={() => navigate("/issue-navigator")}><ChevronLeft size={20} /></button>
            <div className="pat-logo" style={{ margin: 0, fontSize: '1.2rem' }}>vectr</div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Bell size={20} className="chat-action-btn" onClick={onToggleNova} style={{ cursor: 'pointer' }} />
            <button className="send-pr-btn">Send PR</button>
          </div>
        </header>

        <div className="resolution-grid-3">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <section className="panel" style={{ height: '250px' }}>
              <div className="panel-header">Test Results</div>
              <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ renderWithHooks.test.js</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>45ms</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ fiberCommitWork.test.js</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>112ms</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ gcSweep.test.js</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>8ms</span>
                </div>
              </div>
            </section>
            <section className="panel" style={{ flex: 1 }}>
              <div className="panel-header">Code changes</div>
              <div className="panel-content" style={{ overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre', padding: '1.5rem', background: 'rgba(0,0,0,0.4)' }}>
                <span style={{ color: '#f87171' }}>-  node.alternate = null; // Sometimes missed</span>
                <br />
                <span style={{ color: '#4ade80' }}>+  if (node.alternate !== null) {'{'}</span>
                <br />
                <span style={{ color: '#4ade80' }}>+    node.alternate.return = null;</span>
                <br />
                <span style={{ color: '#4ade80' }}>+    node.alternate = null;</span>
                <br />
                <span style={{ color: '#4ade80' }}>+  {'}'}</span>
                <br />
                <span>   node.return = null;</span>
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panel-header">Drafted PR</div>
            <div className="panel-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" defaultValue="Fix memory leak in concurrent rendering fiber detachment" style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', fontSize: '1rem', fontWeight: 600 }} />
              <textarea
                style={{ width: '100%', flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', resize: 'none', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none' }}
                defaultValue={`## Summary\nEnsure GC can collect detached fibers by safely nulling references to alternates during the commit deletion phase.\n\n## Testing\n142 passing tests.Validated with local memory profiling.\n\nFixes #402.`}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: 'auto' }}>
                <button className="cancel-btn">Discard</button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

const Dashboard = ({ theme, toggleTheme, onToggleNova }) => {
  const navigate = useNavigate();
  const contributions = [
    { repo: "google/material-design", issue: "Issue #167: Update color tokens", status: "accepted" },
    { repo: "facebook/react", issue: "Issue #402: Concurrent mode bug", status: "waiting", active: true },
    { repo: "vercel/next.js", issue: "Issue #891: Image optimization", status: "rejected" },
    { repo: "tensorflow/tensorflow", issue: "Issue #1002: GPU Memory Leak", status: "accepted" }
  ];

  const workingIssues = [
    { repo: "google/zx", issue: "Issue #52: Bash interop", lang: "JS" },
    { repo: "rust-lang/rust", issue: "Issue #122: Memory safety", lang: "Rust" },
    { repo: "golang/go", issue: "Issue #505: Map concurrency panic", lang: "Go" }
  ];

  return (
    <div className="resolution-container" style={{ padding: 0 }}>
      <Sidebar activeItem="dashboard" />
      <main className="main-content" style={{ flex: 1, padding: '2rem 4rem 2rem 2rem', overflowY: 'auto', minHeight: '100vh' }}>
        <header className="dashboard-header" style={{ marginBottom: '3rem' }}>
          <div className="user-info">
            <span style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>GSoC Command Center</span>
            <h1 className="username" style={{ fontSize: '2.5rem', marginTop: '0.5rem' }}>Welcome, Krushna</h1>
            <div className="badge-row" style={{ marginTop: '0.5rem' }}>
              <span className="level-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '0.4rem 1.2rem' }}>GSoC Challenger</span>
              <span className="level-badge" style={{ background: '#4c1d95', color: '#e9d5ff', padding: '0.4rem 1.2rem' }}>Expert</span>
            </div>
          </div>
          <div className="header-actions">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Bell size={24} className="chat-action-btn" onClick={onToggleNova} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', width: '40px', height: '40px', cursor: 'pointer' }} />
            </motion.div>
            <button className="start-btn" onClick={() => navigate("/explorer")} style={{ padding: '0.8rem 2rem', fontSize: '1rem', background: 'var(--accent-primary)', boxShadow: '0 8px 25px rgba(99, 102, 241, 0.4)' }}>
              Explore Projects
            </button>
          </div>
        </header>

        <div className="dashboard-grid" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '2rem' }}>
          <section className="dashboard-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title">RECENT ACTIVITY</h2>
              <Plus size={18} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} />
            </div>
            <div className="item-list" style={{ flex: 1, overflowY: 'auto' }}>
              {contributions.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`list-item ${item.active ? 'active' : ''}`}
                  style={{ padding: '1.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}
                >
                  <span className="repo-name" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{item.repo}</span>
                  <span className="issue-title" style={{ fontSize: '1rem' }}>{item.issue}</span>
                  <span className={`status-badge ${item.status}`} style={{ alignSelf: 'flex-start' }}>{item.status}</span>
                </motion.div>
              ))}
            </div>
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <section className="dashboard-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h2 className="card-title">ACTIVE MISSIONS</h2>
              <div className="item-list">
                {workingIssues.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="list-item"
                    style={{ padding: '1.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '0.8rem' }}
                  >
                    <span className="repo-name" style={{ color: 'var(--success)' }}>{item.repo}</span>
                    <span className="issue-title">{item.issue}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <span className="status-badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80' }}>In Progress</span>
                      <span className="status-badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}>{item.lang}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            <section className="dashboard-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="card-title" style={{ margin: 0 }}>VECTR COMBAT STATS</h2>
                <Activity size={18} style={{ color: 'var(--accent-primary)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Issues Slain</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#4ade80' }}>42</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Global Rank</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24' }}>#84</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Streak</span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>14 Days 🔥</span>
                  </div>
                  <div className="progress-container">
                    <div className="progress-bar" style={{ width: '85%' }}></div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>3 days until next tier</div>
                </div>
              </div>
            </section>

            <section className="dashboard-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="card-title" style={{ margin: 0 }}>CONTRIBUTION FLOW</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Low</span>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <div className="commit-cell" style={{ width: '10px', height: '10px' }} />
                    <div className="commit-cell low" style={{ width: '10px', height: '10px' }} />
                    <div className="commit-cell med" style={{ width: '10px', height: '10px' }} />
                    <div className="commit-cell high" style={{ width: '10px', height: '10px' }} />
                    <div className="commit-cell extreme" style={{ width: '10px', height: '10px' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>High</span>
                </div>
              </div>
              <div className="commit-map-container" style={{ padding: '0.5rem 0', width: '100%', overflowX: 'auto', scrollbarWidth: 'none' }}>
                <div className="commit-map" style={{ width: 'max-content' }}>
                  {Array.from({ length: 364 }).map((_, i) => {
                    // Generate a GitHub-style organic heatmap pattern
                    // Increased probability of commits towards the end (recent)
                    const baseProb = (i / 364) * 0.6;

                    // Create clusters of activity
                    const cluster = Math.sin(i * 0.1) * Math.sin(i * 0.05) * 0.5 + 0.5;

                    // Not completely random; mix deterministic cluster + light noise
                    // A hash value instead of Math.random prevents React from flickering on renders
                    const pseudoRandom = ((i * 1234.5678) % 100) / 100;

                    const activityLevel = (cluster + baseProb) * pseudoRandom;

                    let cellClass = '';
                    if (activityLevel > 0.7) cellClass = 'extreme';
                    else if (activityLevel > 0.5) cellClass = 'high';
                    else if (activityLevel > 0.3) cellClass = 'med';
                    else if (activityLevel > 0.15) cellClass = 'low';

                    return (
                      <div
                        key={i}
                        className={`commit-cell ${cellClass}`}
                        title={`Commit history instance #${i}`}
                      />
                    );
                  })}
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem', fontStyle: 'italic' }}>
                Keep your streak alive to increase your GSoC selection probability.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};


function App() {
  const [theme, setTheme] = useState('dark');
  const [loading, setLoading] = useState(true);
  const [isNovaOpen, setIsNovaOpen] = useState(false);

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
              <Route path="/github-pat" element={<GithubPAT theme={theme} toggleTheme={toggleTheme} />} />
              <Route path="/level-selection" element={<LevelSelection theme={theme} toggleTheme={toggleTheme} />} />
              <Route path="/dashboard" element={<Dashboard theme={theme} toggleTheme={toggleTheme} onToggleNova={() => setIsNovaOpen(!isNovaOpen)} />} />
              <Route path="/explorer" element={<Explorer theme={theme} toggleTheme={toggleTheme} onToggleNova={() => setIsNovaOpen(!isNovaOpen)} />} />
              <Route path="/issue-navigator" element={<IssueNavigator theme={theme} toggleTheme={toggleTheme} onToggleNova={() => setIsNovaOpen(!isNovaOpen)} />} />
              <Route path="/pr-status" element={<PRStatus theme={theme} toggleTheme={toggleTheme} onToggleNova={() => setIsNovaOpen(!isNovaOpen)} />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/" element={<Login theme={theme} toggleTheme={toggleTheme} />} />
            </Routes>
            <AnimatePresence>
              {isNovaOpen && (
                <NovaChatbot onClose={() => setIsNovaOpen(false)} />
              )}
            </AnimatePresence>
          </Router>
        )}
      </AnimatePresence>
    </GoogleOAuthProvider>
  );
}

export default App;
