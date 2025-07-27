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

    const { requestId, action } = await request.json()

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "Request ID and action are required" },
        { status: 400 }
      )
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'accept' or 'reject'" },
        { status: 400 }
      )
    }

    // Find the friend request
    const friendRequest = await prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        toUserId: session.user.id,
        status: 'PENDING'
      }
    })

    if (!friendRequest) {
      return NextResponse.json(
        { error: "Friend request not found or already processed" },
        { status: 404 }
      )
    }

    // Update the friend request status
    const updatedRequest = await prisma.friendRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'accept' ? 'ACCEPTED' : 'REJECTED'
      },
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

    return NextResponse.json({
      message: `Friend request ${action === 'accept' ? 'accepted' : 'rejected'} successfully`,
      friendRequest: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        fromUser: updatedRequest.fromUser
      }
    })
  } catch (error) {
    console.error("Friend request response error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 