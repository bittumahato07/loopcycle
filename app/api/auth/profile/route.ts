import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { createSession, getSession } from "@/lib/auth";
import { User } from "@/models/User";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const preferences = body.preferences;

    if (!name || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid name and email address." }, { status: 400 });
    }
    if (!preferences || typeof preferences.pickupReminders !== "boolean" || typeof preferences.impactUpdates !== "boolean") {
      return NextResponse.json({ error: "Collection preferences are invalid." }, { status: 400 });
    }

    await connectToDatabase();
    const duplicate = await User.findOne({ email, _id: { $ne: session.userId } }).lean();
    if (duplicate) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

    const userId = new mongoose.Types.ObjectId(session.userId);
    await User.collection.updateOne(
      { _id: userId },
      {
        $set: {
          name,
          email,
          "preferences.pickupReminders": preferences.pickupReminders,
          "preferences.impactUpdates": preferences.impactUpdates
        }
      }
    );
    const user = await User.collection.findOne({ _id: userId }, { projection: { name: 1, email: 1, role: 1, preferences: 1 } });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

    const updatedSession = { userId: user._id.toString(), name: user.name, email: user.email, role: user.role };
    await createSession(updatedSession);
    return NextResponse.json({
      user: {
        ...updatedSession,
        preferences: user.preferences ?? { pickupReminders: false, impactUpdates: false }
      }
    });
  } catch (error) {
    console.error("Profile update failed", error);
    return NextResponse.json({ error: "Unable to update your profile." }, { status: 500 });
  }
}
