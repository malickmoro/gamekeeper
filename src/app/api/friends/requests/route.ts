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

    // Get received friend requests (pending)
    const receivedRequests = await prisma.friendRequest.findMany({
      where: {
        toUserId: session.user.id,
        status: 'PENDING'
      },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            email: true,
            isPrivate: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get sent friend requests
    const sentRequests = await prisma.friendRequest.findMany({
      where: {
        fromUserId: session.user.id
      },
      include: {
        toUser: {
          select: {
            id: true,
            username: true,
            email: true,
            isPrivate: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      received: receivedRequests.map(req => ({
        id: req.id,
        status: req.status,
        createdAt: req.createdAt,
        user: req.fromUser
      })),
      sent: sentRequests.map(req => ({
        id: req.id,
        status: req.status,
        createdAt: req.createdAt,
        user: req.toUser
      }))
    })
  } catch (error) {
    console.error("Friend requests error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 