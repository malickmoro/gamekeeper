import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create sample users with hashed passwords
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const user1 = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      username: 'alice',
      password: hashedPassword,
      isPrivate: false,
      hasCompletedOnboarding: true,
    },
  })

  const user2 = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      username: 'bob',
      password: hashedPassword,
      isPrivate: true,
      hasCompletedOnboarding: true,
    },
  })

  console.log(`✅ Created users: ${user1.username}, ${user2.username}`)

  // Create FIFA game
  const fifaGame = await prisma.game.create({
    data: {
      name: 'FIFA',
      isActive: true,
    },
  })

  console.log(`✅ Created game: ${fifaGame.name}`)

  // Create a sample session
  const gameSession = await prisma.gameSession.create({
    data: {
      gameId: fifaGame.id,
      creatorId: user1.id,
    },
  })

  console.log(`✅ Created session for ${fifaGame.name}`)

  // Add participants to the session
  const participant1 = await prisma.participant.create({
    data: {
      gameSessionId: gameSession.id,
      userId: user1.id,
    },
  })

  const participant2 = await prisma.participant.create({
    data: {
      gameSessionId: gameSession.id,
      userId: user2.id,
    },
  })

  console.log(`✅ Added participants to session`)

  // Create a sample result (FIFA match: Alice 3 - 1 Bob)
  const result = await prisma.result.create({
    data: {
      gameSessionId: gameSession.id,
      enteredById: user1.id,
      scoreData: {
        winner: user1.id,
        goals: {
          [user1.id]: 3,  // Alice scored 3 goals
          [user2.id]: 1,  // Bob scored 1 goal
        },
        matchDuration: "90 minutes",
        finalScore: "3-1"
      },
      status: 'PENDING',
    },
  })

  console.log(`✅ Created result for session`)
  console.log('🎉 Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 