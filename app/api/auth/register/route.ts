import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { createSession, hashPassword } from "@/lib/auth";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !email || password.length < 8) {
      return NextResponse.json({ error: "Name, email, and a password of at least 8 characters are required." }, { status: 400 });
    }

    await connectToDatabase();
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

    const user = await User.create({ name, email, passwordHash: await hashPassword(password), role: "citizen" });
    await createSession({ userId: user.id, name: user.name, email: user.email, role: user.role });
    return NextResponse.json({ user: { name: user.name, email: user.email, role: user.role } }, { status: 201 });
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Unable to create the account right now." }, { status: 500 });
  }
}
