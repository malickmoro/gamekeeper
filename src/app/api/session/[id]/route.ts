import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
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
    const gameSession = await prisma.gameSession.findFirst({
      where: {
        OR: [
          { id: sessionId },
          { code: sessionId }
        ]
      },
      include: {
        game: {
          select: {
            id: true,
            name: true
          }
        },
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
          },
          orderBy: {
            joinedAt: 'asc'
          }
        },
        result: {
          include: {
            gameSession: {
              select: {
                createdAt: true
              }
            }
          }
        }
      }
    })

    if (!gameSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      )
    }

    // Time-based logic
    const now = new Date()
    const sessionCreatedAt = new Date(gameSession.createdAt)
    const hoursElapsed = (now.getTime() - sessionCreatedAt.getTime()) / (1000 * 60 * 60)

    let updatedResult = gameSession.result
    let sessionStatus = gameSession.isActive ? 'ACTIVE' : 'INACTIVE'

    // Auto-approval logic: If result is PENDING and 24+ hours have passed
    if (gameSession.result && gameSession.result.status === "PENDING" && hoursElapsed >= 24) {
      updatedResult = await prisma.result.update({
        where: { id: gameSession.result.id },
        data: { status: "APPROVED" },
        include: {
          gameSession: {
            select: {
              createdAt: true
            }
          }
        }
      })
    }

    // Auto-void logic: If no result exists and 24+ hours have passed since session creation
    if (!gameSession.result && hoursElapsed >= 24 && gameSession.isActive) {
      await prisma.gameSession.update({
        where: { id: gameSession.id },
        data: { isActive: false }
      })
      sessionStatus = 'VOID'
    }

    // Determine final session status
    if (updatedResult) {
      sessionStatus = updatedResult.status
    } else if (!gameSession.isActive || sessionStatus === 'VOID') {
      sessionStatus = 'VOID'
    }

    return NextResponse.json({
      session: {
        ...gameSession,
        result: updatedResult,
        isActive: sessionStatus !== 'VOID' ? gameSession.isActive : false,
        sessionStatus,
        timeElapsed: hoursElapsed
      }
    })
  } catch (error) {
    console.error("Session fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 