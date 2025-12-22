import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  try {
    console.log('Testing LeadGenSession table...')
    const count = await prisma.leadGenSession.count()
    console.log('✅ LeadGenSession table exists, count:', count)
    
    console.log('\nTesting Lead table...')
    const leadCount = await prisma.lead.count()
    console.log('✅ Lead table exists, count:', leadCount)
    
    console.log('\nSample sessions:')
    const sessions = await prisma.leadGenSession.findMany({
      take: 5,
      orderBy: { startedAt: 'desc' },
      include: {
        leads: { take: 3 }
      }
    })
    
    if (sessions.length === 0) {
      console.log('No sessions found yet')
    } else {
      sessions.forEach(s => {
        console.log(`- Session ${s.id}: ${s.status}, ${s.leads.length} leads, started ${s.startedAt}`)
      })
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

test()
