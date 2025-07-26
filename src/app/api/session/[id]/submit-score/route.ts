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
    const { scoreData } = await request.json()

    if (!scoreData) {
      return NextResponse.json(
        { error: "Score data is required" },
        { status: 400 }
      )
    }

    // Find the game session
    const gameSession = await prisma.gameSession.findFirst({
      where: {
        OR: [
          { id: sessionId },
          { code: sessionId }
        ],
        isActive: true
      },
      include: {
        participants: true,
        result: true
      }
    })

    if (!gameSession) {
      return NextResponse.json(
        { error: "Session not found or inactive" },
        { status: 404 }
      )
    }

    // Check if user is a participant
    const isParticipant = gameSession.participants.some(
      p => p.userId === session.user.id
    )

    if (!isParticipant) {
      return NextResponse.json(
        { error: "You must be a participant to submit scores" },
        { status: 403 }
      )
    }

    // Check if result already exists
    if (gameSession.result) {
      return NextResponse.json(
        { error: "Score has already been submitted for this session" },
        { status: 400 }
      )
    }

    // Create the result
    const result = await prisma.result.create({
      data: {
        gameSessionId: gameSession.id,
        enteredById: session.user.id,
        scoreData: scoreData,
        status: "PENDING"
      }
    })

    return NextResponse.json({
      message: "Score submitted successfully",
      result: {
        id: result.id,
        status: result.status,
        scoreData: result.scoreData,
        createdAt: result.createdAt
      }
    })
  } catch (error) {
    console.error("Score submission error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 