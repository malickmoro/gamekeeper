import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: sessionId } = await params

    // Find the game session by ID or code
    const gameSessionData = await prisma.gameSession.findFirst({
      where: {
        OR: [
          { id: sessionId },
          { code: sessionId }
        ],
        isActive: true
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
        }
      }
    })

    if (!gameSessionData) {
      return NextResponse.json(
        { error: "Session not found or inactive" },
        { status: 404 }
      )
    }

    // Check if user is already a participant
    const existingParticipant = gameSessionData.participants.find(
      p => p.userId === session.user.id
    )

    if (!existingParticipant) {
      // Add user as participant
      await prisma.participant.create({
        data: {
          gameSessionId: gameSessionData.id,
          userId: session.user.id
        }
      })

      // Fetch updated session data
      const updatedSession = await prisma.gameSession.findUnique({
        where: { id: gameSessionData.id },
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
          }
        }
      })

      return NextResponse.json({
        session: updatedSession,
        message: "Successfully joined session"
      })
    }

    return NextResponse.json({
      session: gameSessionData,
      message: "Already a participant in this session"
    })
  } catch (error) {
    console.error("Session join error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 