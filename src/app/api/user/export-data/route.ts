import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Fetch game sessions created by user
    const gameSessions = await prisma.gameSession.findMany({
      where: { creatorId: session.user.id },
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
        result: true
      }
    })

    // Fetch participations
    const participations = await prisma.participant.findMany({
      where: { userId: session.user.id },
      include: {
        gameSession: {
          include: {
            game: true,
            result: true
          }
        }
      }
    })

    // Fetch friend requests
    const sentRequests = await prisma.friendRequest.findMany({
      where: { fromUserId: session.user.id },
      include: {
        toUser: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    })

    const receivedRequests = await prisma.friendRequest.findMany({
      where: { toUserId: session.user.id },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    })

    // Create export data
    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isPrivate: user.isPrivate,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      gameSessions: gameSessions.map(session => ({
        id: session.id,
        code: session.code,
        gameName: session.game.name,
        isActive: session.isActive,
        createdAt: session.createdAt,
        participants: session.participants.map(p => ({
          userId: p.user.id,
          username: p.user.username,
          email: p.user.email
        })),
        result: session.result ? {
          id: session.result.id,
          status: session.result.status,
          createdAt: session.result.createdAt
        } : null
      })),
      participations: participations.map(p => ({
        sessionId: p.gameSession.id,
        sessionCode: p.gameSession.code,
        gameName: p.gameSession.game.name,
        isActive: p.gameSession.isActive,
        createdAt: p.gameSession.createdAt,
        result: p.gameSession.result ? {
          id: p.gameSession.result.id,
          status: p.gameSession.result.status,
          createdAt: p.gameSession.result.createdAt
        } : null
      })),
      friendRequests: {
        sent: sentRequests.map(req => ({
          id: req.id,
          status: req.status,
          createdAt: req.createdAt,
          toUser: {
            id: req.toUser.id,
            username: req.toUser.username,
            email: req.toUser.email
          }
        })),
        received: receivedRequests.map(req => ({
          id: req.id,
          status: req.status,
          createdAt: req.createdAt,
          fromUser: {
            id: req.fromUser.id,
            username: req.fromUser.username,
            email: req.fromUser.email
          }
        }))
      }
    }

    // Return as JSON with proper headers for download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="gamekeeper-data-${new Date().toISOString().split('T')[0]}.json"`
      }
    })
  } catch (error) {
    console.error("Error exporting user data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 