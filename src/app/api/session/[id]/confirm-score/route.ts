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
    const { action } = await request.json() // "approve" or "reject"

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
        { status: 400 }
      )
    }

    // Find the game session with result
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
      (p: { userId: string }) => p.userId === session.user.id
    )

    if (!isParticipant) {
      return NextResponse.json(
        { error: "You must be a participant to confirm scores" },
        { status: 403 }
      )
    }

    // Check if result exists
    if (!gameSession.result) {
      return NextResponse.json(
        { error: "No score has been submitted for this session" },
        { status: 400 }
      )
    }

    // Check if user is trying to confirm their own submission
    if (gameSession.result.enteredById === session.user.id) {
      return NextResponse.json(
        { error: "You cannot confirm your own score submission" },
        { status: 403 }
      )
    }

    // Check if result is still pending
    if (gameSession.result.status !== "PENDING") {
      return NextResponse.json(
        { error: "This result has already been confirmed" },
        { status: 400 }
      )
    }

    // Update the result status
    const updatedResult = await prisma.result.update({
      where: { id: gameSession.result.id },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        approvedById: session.user.id,
      }
    })

    return NextResponse.json({
      message: `Score ${action === "approve" ? "approved" : "rejected"} successfully`,
      result: {
        id: updatedResult.id,
        status: updatedResult.status,
        approvedById: updatedResult.approvedById,
        updatedAt: updatedResult.updatedAt
      }
    })
  } catch (error) {
    console.error("Score confirmation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 