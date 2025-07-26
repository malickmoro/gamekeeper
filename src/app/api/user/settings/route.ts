import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Fetch current user settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Mock data for now to test the frontend
    const mockUser = {
      id: session.user.id,
      email: session.user.email || "user@example.com",
      username: session.user.username || "user",
      isPrivate: false, // Default value
      hasCompletedOnboarding: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      user: mockUser
    })
  } catch (error) {
    console.error("Error fetching user settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - Update user settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { isPrivate } = body

    // Validate the input
    if (typeof isPrivate !== 'boolean') {
      return NextResponse.json(
        { error: "isPrivate must be a boolean value" },
        { status: 400 }
      )
    }

    // For now, return mock data to test the frontend
    // In production, this would update the database:
    // await prisma.user.update({
    //   where: { id: session.user.id },
    //   data: { isPrivate }
    // })

    const updatedUser = {
      id: session.user.id,
      email: session.user.email || "user@example.com",
      username: session.user.username || "user",
      isPrivate: isPrivate, // Use the value from the request
      hasCompletedOnboarding: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      message: "Settings updated successfully",
      user: updatedUser
    })
  } catch (error) {
    console.error("Error updating user settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 