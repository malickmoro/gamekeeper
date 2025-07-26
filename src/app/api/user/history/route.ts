import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
    const mockSessions = [
      {
        id: "mock-session-1",
        code: "ABC123",
        game: {
          id: "game-1",
          name: "Chess"
        },
        createdBy: {
          id: session.user.id,
          username: session.user.username || "You",
          email: session.user.email || ""
        },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        joinedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        participantCount: 2,
        result: {
          id: "result-1",
          status: "APPROVED",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          enteredById: session.user.id,
          approvedById: "other-user"
        },
        isActive: false,
        status: "APPROVED",
        timeElapsed: 48,
        isCreator: true
      },
      {
        id: "mock-session-2",
        code: "XYZ789",
        game: {
          id: "game-2",
          name: "Poker"
        },
        createdBy: {
          id: "other-user",
          username: "Alice",
          email: "alice@example.com"
        },
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        joinedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        participantCount: 3,
        result: {
          id: "result-2",
          status: "PENDING",
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
          enteredById: "other-user",
          approvedById: null
        },
        isActive: true,
        status: "PENDING",
        timeElapsed: 24,
        isCreator: false
      },
      {
        id: "mock-session-3",
        code: "DEF456",
        game: {
          id: "game-3",
          name: "Scrabble"
        },
        createdBy: {
          id: session.user.id,
          username: session.user.username || "You",
          email: session.user.email || ""
        },
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        joinedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        participantCount: 4,
        result: null,
        isActive: true,
        status: "ACTIVE",
        timeElapsed: 12,
        isCreator: true
      }
    ]

    return NextResponse.json({
      sessions: mockSessions,
      totalCount: mockSessions.length
    })
  } catch (error) {
    console.error("Error fetching user history:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 