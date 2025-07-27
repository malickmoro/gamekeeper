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

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters long" },
        { status: 400 }
      )
    }

    // Search for users by username or email
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: query.trim(),
              mode: 'insensitive'
            }
          },
          {
            email: {
              contains: query.trim(),
              mode: 'insensitive'
            }
          }
        ],
        // Don't include the current user in search results
        id: {
          not: session.user.id
        },
        // Only include users who have completed onboarding
        hasCompletedOnboarding: true
      },
      select: {
        id: true,
        username: true,
        email: true,
        isPrivate: true,
        createdAt: true,
        // Check if there's a friend request between users
        sentFriendRequests: {
          where: {
            toUserId: session.user.id
          },
          select: {
            id: true,
            status: true
          }
        },
        receivedFriendRequests: {
          where: {
            fromUserId: session.user.id
          },
          select: {
            id: true,
            status: true
          }
        }
      },
      take: limit,
      orderBy: {
        username: 'asc'
      }
    })

    // Transform the data to include friendship status
    const transformedUsers = users.map(user => {
      const sentRequest = user.sentFriendRequests[0]
      const receivedRequest = user.receivedFriendRequests[0]
      
      let friendshipStatus = 'NONE'
      if (sentRequest) {
        friendshipStatus = sentRequest.status
      } else if (receivedRequest) {
        friendshipStatus = receivedRequest.status === 'PENDING' ? 'PENDING_RECEIVED' : receivedRequest.status
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        isPrivate: user.isPrivate,
        createdAt: user.createdAt,
        friendshipStatus
      }
    })

    return NextResponse.json({
      users: transformedUsers,
      totalCount: transformedUsers.length
    })
  } catch (error) {
    console.error("User search error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 