'use client';
import { useEffect, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();
  const [emails, setEmails] = useState<any[]>([]);

  useEffect(() => {
    if (session) {
      fetch('/api/mails')
        .then(res => res.json())
        .then(data => setEmails(data.emails || []))
        .catch(err => console.error("Error fetching emails:", err));
    }
  }, [session]);

  if (status === "loading") return <div>Loading...</div>;

  if (!session) {
    return (
      <div className="flex justify-center items-center h-screen flex-col gap-4">
        <button onClick={() => signIn('google')} className="bg-blue-500 text-white px-4 py-2 rounded">Sign in with Google</button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📬 Your Recent Emails</h1>
      <button onClick={() => signOut()} className="mb-4 bg-red-500 text-white px-4 py-2 rounded">Sign Out</button>
      <ul className="space-y-4">
        {emails.map((email) => (
          <li key={email.id} className="border p-4 rounded shadow">
            <p><strong>From:</strong> {email.headers?.find((h: any) => h.name === "From")?.value}</p>
            <p><strong>Subject:</strong> {email.headers?.find((h: any) => h.name === "Subject")?.value}</p>
            <p className="text-sm text-gray-600 mt-2">{email.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
