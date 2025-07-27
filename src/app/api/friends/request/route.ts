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

    const { toUserId } = await request.json()

    if (!toUserId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Check if user is trying to send request to themselves
    if (toUserId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot send a friend request to yourself" },
        { status: 400 }
      )
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: toUserId }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if friend request already exists
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          {
            fromUserId: session.user.id,
            toUserId: toUserId
          },
          {
            fromUserId: toUserId,
            toUserId: session.user.id
          }
        ]
      }
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: "Friend request already exists" },
        { status: 400 }
      )
    }

    // Create friend request
    const friendRequest = await prisma.friendRequest.create({
      data: {
        fromUserId: session.user.id,
        toUserId: toUserId,
        status: 'PENDING'
      },
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

    return NextResponse.json({
      message: "Friend request sent successfully",
      friendRequest: {
        id: friendRequest.id,
        status: friendRequest.status,
        toUser: friendRequest.toUser
      }
    })
  } catch (error) {
    console.error("Friend request error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 