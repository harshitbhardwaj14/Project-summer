'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import './globals.css'; // Ensure global styles are imported

type Email = {
  id: string;
  snippet: string;
  internalDate?: string;
  headers?: { name: string; value: string }[];
};

export default function Home() {
  const { data: session, status } = useSession();
  const [emails, setEmails] = useState<Email[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
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

  const handleSummarizeClick = async () => {
    setSummarizing(true);
    try {
      const res = await fetch("/api/summarize-emails", { method: "POST" });
      const data = await res.json();
      setSummary(data.summary);
    } catch (error) {
      console.error("Failed to summarize emails", error);
    } finally {
      setSummarizing(false);
    }
  };

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
    <div className="bg-neutral-900/50 backdrop-blur-lg border border-neutral-800/50 rounded-2xl p-5 animate-pulse space-y-3">
      <div className="h-4 bg-neutral-800/50 rounded-full w-1/2" />
      <div className="h-4 bg-neutral-800/50 rounded-full w-1/3" />
      <div className="h-3 bg-neutral-800/50 rounded-full w-3/4 mt-2" />
    </div>
  );

  if (status === "loading") {
    return (
      <div className="h-screen bg-gradient-to-br from-black to-neutral-950 text-white flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="text-lg font-medium tracking-wide bg-neutral-900/30 backdrop-blur-lg px-6 py-4 rounded-2xl border border-neutral-800/50"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen bg-gradient-to-br from-black via-neutral-950 to-neutral-900 text-white flex flex-col items-center justify-center px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="bg-neutral-900/20 backdrop-blur-xl p-10 rounded-3xl border border-neutral-800/50 shadow-2xl"
        >
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-semibold mb-6 bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent"
          >
            Welcome to Mail Viewer
          </motion.h1>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => signIn('google')}
            className="bg-white/90 text-black font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Sign in with Google
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black to-neutral-950 text-white px-4 sm:px-6 py-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 p-5 bg-neutral-900/30 backdrop-blur-lg rounded-2xl border border-neutral-800/50 shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
            📬 Inbox
          </h1>
          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSummarizeClick}
              disabled={summarizing}
              className="bg-white/90 text-black font-medium px-4 py-2 rounded-xl shadow hover:shadow-lg transition-all disabled:opacity-50"
            >
              {summarizing ? "Summarizing..." : "Summarize"}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => signOut()}
              className="bg-white/90 text-black font-medium px-4 py-2 rounded-xl shadow hover:shadow-lg transition-all"
            >
              Sign Out
            </motion.button>
          </div>
        </div>

        {/* Email List */}
        <ul className="space-y-4">
          {emails.map((email, index) => {
            const isLast = index === emails.length - 1;
            return (
              <motion.li
                key={email.id}
                ref={isLast ? lastEmailRef : null}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-neutral-900/40 backdrop-blur-lg border border-neutral-800/50 p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all hover:border-neutral-700/50"
              >
                <p className="text-sm text-neutral-300 mb-1">
                  <span className="font-semibold text-white">From:</span> {email.headers?.find(h => h.name === "From")?.value}
                </p>
                <p className="text-sm text-neutral-300 mb-2">
                  <span className="font-semibold text-white">Subject:</span> {email.headers?.find(h => h.name === "Subject")?.value}
                </p>
                <p className="text-sm text-neutral-400 mt-3 mb-3">{email.snippet}</p>
                <p className="text-xs text-neutral-500 mt-2">{formatDate(email.internalDate)}</p>
              </motion.li>
            );
          })}
        </ul>

        {/* Skeleton Loading */}
        <div className="mt-6 space-y-4">
          {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>

        {/* Summary Output */}
        {summary && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 p-6 bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 rounded-2xl text-sm leading-relaxed text-white shadow-md"
          >
            <h2 className="text-lg font-semibold mb-3">🧠 Summary of Top Emails:</h2>
            <p className="whitespace-pre-line text-neutral-300">{summary}</p>
          </motion.div>
        )}

        {/* End Message */}
        {!loading && emails.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-neutral-500 text-sm mt-8 p-4 bg-neutral-900/20 backdrop-blur-lg rounded-2xl border border-neutral-800/50"
          >
            You've reached the end of your inbox
          </motion.div>
        )}
      </div>
    </main>
  );
}
