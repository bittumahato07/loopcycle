import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { WasteRequest, WasteType } from "@/models/Request";

function unauthorized() {
  return NextResponse.json({ error: "Authentication required." }, { status: 401 });
}

export function serializeRequest(request: { id: string; type: WasteType; location: string; date: string; quantity: string; status: string; collector: string; description: string; photo: boolean; history?: unknown[] }) {
  return {
    id: request.id,
    type: request.type,
    location: request.location,
    date: request.date,
    quantity: request.quantity,
    status: request.status,
    collector: request.collector,
    description: request.description,
    photo: request.photo,
    history: request.history ?? []
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  try {
    await connectToDatabase();
    const filter = session.role === "admin" ? {} : { userId: session.userId };
    const requests = await WasteRequest.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ requests: requests.map((request) => serializeRequest({ ...request, id: request._id.toString() })) });
  } catch (error) {
    console.error("Loading requests failed", error);
    return NextResponse.json({ error: "Unable to load requests." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  try {
    const body = await request.json();
    const type = body.type;
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const date = typeof body.date === "string" ? body.date : "";
    const quantity = typeof body.quantity === "string" ? body.quantity.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const photo = body.photo === true;
    if (!["Plastic", "Organic", "E-waste", "Glass", "Other"].includes(type) || !location || !date || !quantity) {
      return NextResponse.json({ error: "Waste type, location, date, and quantity are required." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: "Pickup date must be today or a future date." }, { status: 400 });
    }
    await connectToDatabase();
    const created = await WasteRequest.create({ userId: session.userId, type, location, date, quantity, description, photo, history: [{ status: "Pending", note: "Request submitted", changedBy: session.userId }] });
    return NextResponse.json({ request: serializeRequest({ ...created.toObject(), id: created._id.toString() }) }, { status: 201 });
  } catch (error) {
    console.error("Creating request failed", error);
    return NextResponse.json({ error: "Unable to create request." }, { status: 500 });
  }
}
