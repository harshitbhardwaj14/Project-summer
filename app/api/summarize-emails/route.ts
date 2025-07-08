import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });

    const gmail = google.gmail({ version: "v1", auth });

    const messagesList = await gmail.users.messages.list({
        userId: "me",
        maxResults: 5,
    });

    const messages = messagesList.data.messages || [];

    const emailContents = await Promise.all(
        messages.map(async (msg) => {
            const detail = await gmail.users.messages.get({
                userId: "me",
                id: msg.id!,
                format: "full",
            });

            const headers = detail.data.payload?.headers || [];
            const subject = headers.find((h) => h.name === "Subject")?.value ?? "No Subject";

            const body =
                detail.data.payload?.parts?.[0]?.body?.data ??
                detail.data.payload?.body?.data ??
                "";

            const decoded = Buffer.from(body || "", "base64").toString("utf-8");

            return `Subject: ${subject}\n${decoded}`;
        })
    );

    const prompt = `Analyze these emails and extract the most critical information following these rules:

1. Create exactly 5 bullet points per email (new line for each email)
2. Format strictly without ** or any markdown symbols
3. Prioritize in this order:
   - Deadlines/dates (highlight with [DUE: MM/DD])
   - Decisions made or required
   - Action items with owners
   - Risks/blockers needing attention
   - Key insights or trends

4. For each email, structure like this:
[Email 1]
- Point 1 (include deadline first if exists)
- Point 2 (action item)
- Point 3 (key decision)
- Point 4 (risk/opportunity)
- Point 5 (strategic insight)

[Email 2]
- ...

5. Omit:
   - Greetings/closings
   - Repeated information
   - Non-essential details

Emails:
${emailContents.join("\n\n---\n")}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    return NextResponse.json({ summary });
}
