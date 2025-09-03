import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SimpleDashboard from './components/SimpleDashboard.tsx';
import FeedDetail from './components/FeedDetail.tsx';
import Layout from './components/Layout.tsx';
import EmbedPlayer from './components/EmbedPlayer.tsx';
import BlogEmbed from './components/BlogEmbed.tsx';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Embed routes without layout */}
          <Route path="/embed/:feedUrl" element={<EmbedPlayer />} />
          <Route path="/blog-embed/:feedUrl" element={<BlogEmbed />} />
          
          {/* Regular routes with layout */}
          <Route path="/*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<SimpleDashboard />} />
                <Route path="/feed/:feedUrl" element={<FeedDetail />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;