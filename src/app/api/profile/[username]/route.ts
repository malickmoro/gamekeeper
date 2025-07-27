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

    // Find the user by username
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        isPrivate: true,
        createdAt: true,
        hasCompletedOnboarding: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if user has completed onboarding
    if (!user.hasCompletedOnboarding) {
      return NextResponse.json(
        { error: "User profile not available" },
        { status: 404 }
      )
    }

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
    // Fetch user's game sessions
    const userSessions = await prisma.gameSession.findMany({
      where: {
        participants: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        game: true,
        createdBy: {
          select: {
            id: true,
            username: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        result: {
          select: {
            id: true,
            status: true,
            scoreData: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Limit to recent 10 sessions
    })

    // Transform sessions and calculate stats
    const sessions = userSessions.map(session => {
      const isCreator = session.creatorId === user.id
      const participantCount = session.participants.length
      
      // Determine outcome based on result
      let outcome = 'UNKNOWN'
      if (session.result && session.result.status === 'APPROVED') {
        const scoreData = session.result.scoreData as any
        if (scoreData.winner === user.id) {
          outcome = 'WIN'
        } else if (scoreData.winner === 'DRAW') {
          outcome = 'DRAW'
        } else {
          outcome = 'LOSS'
        }
      }

      return {
        id: session.id,
        code: session.code,
        game: session.game,
        createdBy: session.createdBy,
        createdAt: session.createdAt.toISOString(),
        participantCount,
        result: session.result,
        isCreator,
        outcome
      }
    })

    // Calculate stats
    const totalGames = sessions.length
    const wins = sessions.filter(s => s.outcome === "WIN").length
    const losses = sessions.filter(s => s.outcome === "LOSS").length
    const draws = sessions.filter(s => s.outcome === "DRAW").length
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : "0.0"

    // Games breakdown
    const gameStats = sessions.reduce((acc, session) => {
      const gameName = session.game.name
      if (!acc[gameName]) {
        acc[gameName] = { total: 0, wins: 0, losses: 0, draws: 0 }
      }
      acc[gameName].total++
      if (session.outcome === "WIN") acc[gameName].wins++
      if (session.outcome === "LOSS") acc[gameName].losses++
      if (session.outcome === "DRAW") acc[gameName].draws++
      return acc
    }, {} as Record<string, { total: number; wins: number; losses: number; draws: number }>)

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        isPrivate: user.isPrivate,
        createdAt: user.createdAt.toISOString()
      },
      isPrivate: false,
      stats: {
        totalGames,
        wins,
        losses,
        draws,
        winRate: parseFloat(winRate),
        gameStats
      },
      recentSessions: sessions,
      totalSessions: sessions.length
    })

  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 