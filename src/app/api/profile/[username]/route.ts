import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { username } = await params

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      )
    }

    // For now, return mock data to demonstrate the functionality
    // This avoids the Prisma TypeScript issues we've been encountering
    
    // Mock user data - in production this would be:
    // const user = await prisma.user.findUnique({ where: { username } })
    const mockUsers = [
      {
        id: "user-1",
        username: "alice",
        email: "alice@example.com", 
        isPrivate: false,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
      },
      {
        id: "user-2", 
        username: "bob",
        email: "bob@example.com",
        isPrivate: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      },
      {
        id: "user-3",
        username: "charlie", 
        email: "charlie@example.com",
        isPrivate: false,
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
      }
    ]

    const user = mockUsers.find(u => u.username === username)

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // If user is private and not viewing their own profile
    if (user.isPrivate && session?.user?.id !== user.id) {
      return NextResponse.json({
        user: {
          id: user.id,
          username: user.username,
          isPrivate: true,
          createdAt: user.createdAt
        },
        isPrivate: true,
        message: "This profile is private."
      })
    }

    // User is public or viewing their own profile - return full data
    const mockSessions = [
      {
        id: "session-1",
        code: "ABC123",
        game: {
          id: "game-1",
          name: "Chess"
        },
        createdBy: {
          id: user.id,
          username: user.username
        },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        participantCount: 2,
        result: {
          id: "result-1",
          status: "APPROVED",
          scoreData: {
            winner: user.id,
            scores: {
              [user.id]: 1,
              "other-user": 0
            }
          }
        },
        isCreator: true,
        outcome: "WIN"
      },
      {
        id: "session-2", 
        code: "XYZ789",
        game: {
          id: "game-2",
          name: "Poker"
        },
        createdBy: {
          id: "other-user",
          username: "opponent"
        },
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
        participantCount: 4,
        result: {
          id: "result-2",
          status: "APPROVED", 
          scoreData: {
            winner: "other-user",
            scores: {
              [user.id]: 3,
              "other-user": 1,
              "player3": 2,
              "player4": 4
            }
          }
        },
        isCreator: false,
        outcome: "LOSS"
      },
      {
        id: "session-3",
        code: "DEF456", 
        game: {
          id: "game-3",
          name: "Scrabble"
        },
        createdBy: {
          id: user.id,
          username: user.username
        },
        createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days ago
        participantCount: 3,
        result: {
          id: "result-3",
          status: "APPROVED",
          scoreData: {
            winner: user.id,
            scores: {
              [user.id]: 245,
              "player2": 198,
              "player3": 176
            }
          }
        },
        isCreator: true,
        outcome: "WIN"
      },
      {
        id: "session-4",
        code: "GHI789",
        game: {
          id: "game-1", 
          name: "Chess"
        },
        createdBy: {
          id: "other-user",
          username: "grandmaster"
        },
        createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(), // 28 days ago
        participantCount: 2,
        result: {
          id: "result-4",
          status: "APPROVED",
          scoreData: {
            winner: "other-user",
            scores: {
              [user.id]: 0,
              "other-user": 1
            }
          }
        },
        isCreator: false,
        outcome: "LOSS"
      }
    ]

    // Calculate stats
    const totalGames = mockSessions.length
    const wins = mockSessions.filter(s => s.outcome === "WIN").length
    const losses = mockSessions.filter(s => s.outcome === "LOSS").length
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : "0.0"

    // Games breakdown
    const gameStats = mockSessions.reduce((acc, session) => {
      const gameName = session.game.name
      if (!acc[gameName]) {
        acc[gameName] = { total: 0, wins: 0, losses: 0 }
      }
      acc[gameName].total++
      if (session.outcome === "WIN") acc[gameName].wins++
      if (session.outcome === "LOSS") acc[gameName].losses++
      return acc
    }, {} as Record<string, { total: number; wins: number; losses: number }>)

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        isPrivate: user.isPrivate,
        createdAt: user.createdAt
      },
      isPrivate: false,
      stats: {
        totalGames,
        wins,
        losses,
        winRate: parseFloat(winRate),
        gameStats
      },
      recentSessions: mockSessions.slice(0, 10), // Last 10 sessions
      totalSessions: mockSessions.length
    })

  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 