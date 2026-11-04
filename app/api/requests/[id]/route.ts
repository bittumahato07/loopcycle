import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { WasteRequest, RequestStatus } from "@/models/Request";

const statuses: RequestStatus[] = ["Pending", "Assigned", "Collected", "Completed", "Cancelled"];

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const { id } = await context.params;
    await connectToDatabase();
    const filter = session.role === "admin" ? { _id: id } : { _id: id, userId: session.userId };
    const request = await WasteRequest.findOne(filter).lean();
    if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });
    return NextResponse.json({ request: { ...request, id: request._id.toString(), _id: undefined } });
  } catch (error) {
    console.error("Loading request failed", error);
    return NextResponse.json({ error: "Unable to load request." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = await request.json();
    await connectToDatabase();
    const filter = session.role === "admin" ? { _id: id } : { _id: id, userId: session.userId };
    const current = await WasteRequest.findOne(filter).exec();
    if (!current) return NextResponse.json({ error: "Request not found." }, { status: 404 });

    const nextStatus = body.status as RequestStatus | undefined;
    const collector = typeof body.collector === "string" ? body.collector.trim() : undefined;
    const isCitizenCancellation = session.role !== "admin" && nextStatus === "Cancelled";
    const isAdminUpdate = session.role === "admin" && (nextStatus !== undefined || collector !== undefined);
    if (!isCitizenCancellation && !isAdminUpdate) return NextResponse.json({ error: "You cannot update this request." }, { status: 403 });
    if (nextStatus && !statuses.includes(nextStatus)) return NextResponse.json({ error: "Invalid request status." }, { status: 400 });
    if (isCitizenCancellation && current.status !== "Pending") return NextResponse.json({ error: "Only pending requests can be cancelled." }, { status: 409 });
    if (session.role === "admin" && nextStatus === "Cancelled") return NextResponse.json({ error: "Citizens must cancel their own pending requests." }, { status: 403 });
    if (collector !== undefined && !collector) return NextResponse.json({ error: "Collector name is required." }, { status: 400 });

    const changes: Record<string, unknown> = {};
    if (nextStatus && nextStatus !== current.status) changes.status = nextStatus;
    if (collector !== undefined && collector !== current.collector) changes.collector = collector;
    if (Object.keys(changes).length === 0) return NextResponse.json({ request: { ...current.toObject(), id: current.id } });

    if (nextStatus && nextStatus !== current.status) {
      changes.$push = { history: { status: nextStatus, note: nextStatus === "Cancelled" ? "Request cancelled by citizen" : `Status changed to ${nextStatus}`, changedBy: session.userId } };
    }
    const updated = await WasteRequest.findByIdAndUpdate(id, changes, { new: true }).lean();
    return NextResponse.json({ request: { ...updated, id: updated?._id.toString(), _id: undefined } });
  } catch (error) {
    console.error("Updating request failed", error);
    return NextResponse.json({ error: "Unable to update request." }, { status: 500 });
  }
}
