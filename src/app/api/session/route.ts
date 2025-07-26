import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { gameId } = await request.json()

    if (!gameId) {
      return NextResponse.json(
        { error: "Game ID is required" },
        { status: 400 }
      )
    }

    // Verify game exists and is active
    const game = await prisma.game.findFirst({
      where: {
        id: gameId,
        isActive: true
      }
    })

    if (!game) {
      return NextResponse.json(
        { error: "Game not found or inactive" },
        { status: 404 }
      )
    }

    // Create new session
    const gameSession = await prisma.gameSession.create({
      data: {
        gameId,
        creatorId: session.user.id,
        participants: {
          create: {
            userId: session.user.id
          }
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
        }
      }
    })

    return NextResponse.json({
      session: gameSession
    })
  } catch (error) {
    console.error("Session creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 