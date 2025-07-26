import { prisma } from './prisma'

/**
 * Generates a unique 8-character session code in the format: AA123456
 * - First 2 characters: Uppercase letters (A-Z)
 * - Last 6 characters: Numbers (0-9)
 */
export function generateSessionCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  
  // Generate first 2 letters
  const firstLetter = letters[Math.floor(Math.random() * letters.length)]
  const secondLetter = letters[Math.floor(Math.random() * letters.length)]
  
  // Generate 6 random numbers
  let numbersPart = ''
  for (let i = 0; i < 6; i++) {
    numbersPart += numbers[Math.floor(Math.random() * numbers.length)]
  }
  
  return `${firstLetter}${secondLetter}${numbersPart}`
}

/**
 * Generates a unique session code that doesn't already exist in the database
 */
export async function generateUniqueSessionCode(): Promise<string> {
  let code: string
  let isUnique = false
  let attempts = 0
  const maxAttempts = 10
  
  while (!isUnique && attempts < maxAttempts) {
    code = generateSessionCode()
    
    // Check if code already exists
    const existingSession = await prisma.gameSession.findUnique({
      where: { code }
    })
    
    if (!existingSession) {
      isUnique = true
      return code
    }
    
    attempts++
  }
  
  // If we've tried too many times, throw an error
  throw new Error('Unable to generate unique session code after maximum attempts')
} 