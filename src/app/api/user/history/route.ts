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

    // Fetch sessions created by the user
    const createdSessions = await prisma.gameSession.findMany({
      where: {
        creatorId: session.user.id
      },
      include: {
        game: true,
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
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Fetch sessions where user is a participant (but not creator)
    const participations = await prisma.gameSession.findMany({
      where: {
        participants: {
          some: {
            userId: session.user.id
          }
        },
        creatorId: {
          not: session.user.id
        }
      },
      include: {
        game: true,
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
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform created sessions
    const transformedCreatedSessions = createdSessions.map(session => ({
      id: session.id,
      code: session.code,
      game: session.game,
      isActive: session.isActive,
      createdAt: session.createdAt.toISOString(),
      participants: session.participants,
      result: session.result
    }))

    // Transform participations
    const transformedParticipations = participations.map(session => ({
      sessionId: session.id,
      sessionCode: session.code,
      gameName: session.game.name,
      isActive: session.isActive,
      createdAt: session.createdAt.toISOString(),
      result: session.result
    }))

    return NextResponse.json({
      createdSessions: transformedCreatedSessions,
      participations: transformedParticipations
    })
  } catch (error) {
    console.error("Error fetching user history:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 