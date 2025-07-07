import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken as string });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const messagesRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 5,
  });

  const messages = messagesRes.data.messages || [];

  const emails = await Promise.all(
    messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From'],
      });
      return {
        id: detail.data.id,
        snippet: detail.data.snippet,
        headers: detail.data.payload?.headers,
      };
    })
  );

  return NextResponse.json({ emails });
}
