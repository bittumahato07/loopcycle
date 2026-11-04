import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { createSession, verifyPassword } from "@/lib/auth";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const requestedRole = body.role === "admin" ? "admin" : "citizen";

    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

    await connectToDatabase();
    const user = await User.findOne({ email }).exec();
    if (!user || user.role !== requestedRole || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email, password, or account type." }, { status: 401 });
    }

    await createSession({ userId: user.id, name: user.name, email: user.email, role: user.role });
    return NextResponse.json({ user: { name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}
