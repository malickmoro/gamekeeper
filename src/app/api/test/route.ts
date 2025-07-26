import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()
    
    // Get counts of all models to verify database is working
    const [userCount, gameCount, sessionCount, participantCount, resultCount] = await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.session.count(),
      prisma.participant.count(),
      prisma.result.count(),
    ])

    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      data: {
        userCount,
        gameCount,
        sessionCount,
        participantCount,
        resultCount,
      }
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 