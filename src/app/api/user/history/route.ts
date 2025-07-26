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

    // Fetch actual sessions from database where user is a participant
    const userSessions = await prisma.gameSession.findMany({
      where: {
        participants: {
          some: {
            userId: session.user.id
          }
        }
      },
      include: {
        game: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        },
        result: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            enteredById: true,
            approvedById: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data to match the frontend expectations
    const sessions = userSessions.map(gameSession => {
      const isCreator = gameSession.creatorId === session.user.id
      const participantCount = gameSession.participants.length
      
      // Calculate time elapsed in hours
      const timeElapsed = (Date.now() - new Date(gameSession.createdAt).getTime()) / (1000 * 60 * 60)
      
      // Determine session status
      let status = 'ACTIVE'
      if (gameSession.result) {
        status = gameSession.result.status
      } else if (!gameSession.isActive) {
        status = 'ENDED'
      }

      return {
        id: gameSession.id,
        code: gameSession.code,
        game: gameSession.game,
        createdBy: gameSession.createdBy,
        createdAt: gameSession.createdAt.toISOString(),
        joinedAt: gameSession.participants.find(p => p.userId === session.user.id)?.joinedAt.toISOString() || gameSession.createdAt.toISOString(),
        participantCount,
        result: gameSession.result,
        isActive: gameSession.isActive,
        status,
        timeElapsed,
        isCreator
      }
    })

    return NextResponse.json({
      sessions,
      totalCount: sessions.length
    })
  } catch (error) {
    console.error("Error fetching user history:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 