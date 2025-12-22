import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

console.log('Testing Prisma connection...')

try {
  // Test connection
  await prisma.$queryRaw`SELECT NOW()`
  console.log('✅ Database connected!')

  // Create tables
  console.log('\n🚀 Creating tables...')
  
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS management_files (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_category TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        storage_path TEXT NOT NULL,
        storage_url TEXT NOT NULL,
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)
  console.log('✅ Created management_files table')

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_management_files_user_id ON management_files(user_id)`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_management_files_file_category ON management_files(file_category)`)
  console.log('✅ Created management_files indexes')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS memory_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        title TEXT,
        content TEXT,
        file_url TEXT,
        file_name TEXT,
        file_type TEXT,
        metadata JSONB,
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)
  console.log('✅ Created memory_items table')

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_memory_items_user_id ON memory_items(user_id)`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_memory_items_kind ON memory_items(kind)`)
  console.log('✅ Created memory_items indexes')

  console.log('\n🎉 Migration completed successfully!')

} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
