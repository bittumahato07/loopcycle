import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  try {
    await connectToDatabase();
    const user = await User.findById(session.userId).select("name email role preferences").lean();
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user: { userId: user._id.toString(), name: user.name, email: user.email, role: user.role, preferences: user.preferences ?? { pickupReminders: false, impactUpdates: false } } });
  } catch (error) {
    console.error("Session lookup failed", error);
    return NextResponse.json({ error: "Unable to load your account." }, { status: 500 });
  }
}
