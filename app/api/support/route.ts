import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { SupportTicket } from "@/models/SupportTicket";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const body = await request.json();
    const category = body.category;
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!["Account", "Request", "Technical", "Other"].includes(category) || !subject || !message) {
      return NextResponse.json({ error: "Choose a category and provide a subject and message." }, { status: 400 });
    }

    await connectToDatabase();
    const ticket = await SupportTicket.create({ userId: session.userId, category, subject, message });
    return NextResponse.json({
      ticket: {
        id: ticket.id,
        category: ticket.category,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Support request failed", error);
    return NextResponse.json({ error: "Unable to send your support request." }, { status: 500 });
  }
}
