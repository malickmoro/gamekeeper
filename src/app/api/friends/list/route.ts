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

    // Get accepted friend requests where the current user is either the sender or receiver
    const acceptedRequests = await prisma.friendRequest.findMany({
      where: {
        OR: [
          {
            fromUserId: session.user.id,
            status: 'ACCEPTED'
          },
          {
            toUserId: session.user.id,
            status: 'ACCEPTED'
          }
        ]
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
        },
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
        updatedAt: 'desc'
      }
    })

    // Transform the data to get the friend (not the current user)
    const friends = acceptedRequests.map(request => {
      const isFromUser = request.fromUserId === session.user.id
      const friend = isFromUser ? request.toUser : request.fromUser
      
      return {
        id: friend.id,
        username: friend.username,
        email: friend.email,
        isPrivate: friend.isPrivate,
        createdAt: friend.createdAt,
        friendshipDate: request.updatedAt // When the friendship was established
      }
    })

    return NextResponse.json({
      friends,
      totalCount: friends.length
    })
  } catch (error) {
    console.error("Friends list error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 