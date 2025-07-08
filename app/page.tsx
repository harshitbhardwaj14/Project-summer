'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import './globals.css';
import './Home.css'
import './summary.css';
// Email type definition
type Email = {
  id: string;
  snippet: string;
  internalDate?: string;
  headers?: { name: string; value: string }[];
};

export default function Home() {
  const { data: session, status } = useSession();
  const [emails, setEmails] = useState<Email[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const observerRef = useRef(null);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mails?page=${page}`);
      const data = await res.json();
      setEmails(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const newEmails = (data.emails || []).filter(e => !existingIds.has(e.id));
        return [...prev, ...newEmails];
      });
    } catch (err) {
      console.error("Error fetching emails:", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (session) fetchEmails();
  }, [session, fetchEmails]);

  const lastEmailRef = useCallback((node: any) => {
    if (loading) return;
    if (observerRef.current) (observerRef.current as any).disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setPage(prev => prev + 1);
    });

    if (node) (observerRef.current as any).observe(node);
  }, [loading]);

  const formatDate = (ms: string | undefined) => {
    if (!ms) return '';
    const date = new Date(parseInt(ms));
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const SkeletonCard = () => (
    <div className="card skeleton">
      <div className="bar bar-half" />
      <div className="bar bar-third" />
      <div className="bar bar-large" />
    </div>
  );

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const res = await fetch('/api/summarize-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: emails.slice(0, 10) }),
      });
      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      console.error("Failed to summarize emails:", err);
    } finally {
      setSummarizing(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="page loading">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="loader-box"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="signin-box"
        >
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="heading"
          >
            Welcome to Mail Viewer
          </motion.h1>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => signIn('google')}
            className="signin-btn"
          >
            Sign in with Google
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <main className="page inbox">
      <div className="container">
        <div className="header">
          <h1 className="title">📬 Inbox</h1>
          <div className="actions" style={{ display: 'flex', gap: '1rem' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSummarize}
              className="summary-btn"
            >
              {summarizing ? 'Summarizing...' : 'Summarize Top Emails'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => signOut()}
              className="signout-btn"
            >
              Sign Out
            </motion.button>
          </div>
        </div>

        {summary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="summary-box"
          >
            <h2 className="summary-title">🧠 Summary of Top Emails:</h2>
            <p className="summary-text">{summary}</p>
          </motion.div>
        )}

        <ul className="email-list">
          {emails.map((email, index) => {
            const isLast = index === emails.length - 1;
            return (
              <motion.li
                key={email.id}
                ref={isLast ? lastEmailRef : null}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="card email"
              >
                <p className="meta"><strong>From:</strong> {email.headers?.find(h => h.name === "From")?.value}</p>
                <p className="meta"><strong>Subject:</strong> {email.headers?.find(h => h.name === "Subject")?.value}</p>
                <p className="snippet">{email.snippet}</p>
                <p className="date">{formatDate(email.internalDate)}</p>
              </motion.li>
            );
          })}
        </ul>

        <div className="loading-section">
          {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>

        {!loading && emails.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="end-message"
            style={{ alignItems:'center', display: 'flex', justifyContent: 'center', marginTop: '2rem' }}
          >
            You've reached the end of your inbox
          </motion.div>
        )}
      </div>
    </main>
  );
}
