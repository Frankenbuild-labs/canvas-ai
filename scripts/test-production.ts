// Production testing script
import { DatabaseService } from "../lib/database"
import { jobQueue } from "../lib/job-queue"

async function testDatabaseConnection() {
  console.log("🔍 Testing database connection...")

  try {
    const accounts = await DatabaseService.getUserSocialAccounts(1)
    console.log("✅ Database connection successful")
    console.log(`   Found ${accounts.length} user accounts`)
  } catch (error) {
    console.error("❌ Database connection failed:", error)
    return false
  }

  return true
}

async function testJobQueue() {
  console.log("🔍 Testing job queue system...")

  try {
    await jobQueue.initialize()
    console.log("✅ Job queue initialization successful")
  } catch (error) {
    console.error("❌ Job queue initialization failed:", error)
    return false
  }

  return true
}

async function testOAuthConfigs() {
  console.log("🔍 Testing OAuth configurations...")

  const requiredConfigs = [
    { name: "Instagram", clientId: process.env.INSTAGRAM_CLIENT_ID, secret: process.env.INSTAGRAM_CLIENT_SECRET },
    { name: "Twitter", clientId: process.env.TWITTER_CLIENT_ID, secret: process.env.TWITTER_CLIENT_SECRET },
    { name: "Facebook", clientId: process.env.FACEBOOK_CLIENT_ID, secret: process.env.FACEBOOK_CLIENT_SECRET },
    { name: "LinkedIn", clientId: process.env.LINKEDIN_CLIENT_ID, secret: process.env.LINKEDIN_CLIENT_SECRET },
    { name: "YouTube", clientId: process.env.YOUTUBE_CLIENT_ID, secret: process.env.YOUTUBE_CLIENT_SECRET },
    { name: "TikTok", clientId: process.env.TIKTOK_CLIENT_ID, secret: process.env.TIKTOK_CLIENT_SECRET },
  ]

  let allConfigured = true

  for (const config of requiredConfigs) {
    if (config.clientId && config.secret) {
      console.log(`✅ ${config.name} OAuth configured`)
    } else {
      console.log(`⚠️  ${config.name} OAuth missing credentials`)
      allConfigured = false
    }
  }

  return allConfigured
}

async function testEnvironmentVariables() {
  console.log("🔍 Testing environment variables...")

  const requiredVars = ["DATABASE_URL", "NEXT_PUBLIC_BASE_URL", "TOKEN_ENCRYPTION_KEY"]

  let allPresent = true

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName} configured`)
    } else {
      console.log(`❌ ${varName} missing`)
      allPresent = false
    }
  }

  return allPresent
}

async function runProductionTests() {
  console.log("🚀 Running Social Station Production Tests\n")

  const results = {
    database: await testDatabaseConnection(),
    jobQueue: await testJobQueue(),
    oauth: await testOAuthConfigs(),
    environment: await testEnvironmentVariables(),
  }

  console.log("\n📊 Test Results Summary:")
  console.log("========================")

  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? "✅" : "❌"} ${test}: ${passed ? "PASSED" : "FAILED"}`)
  })

  const allPassed = Object.values(results).every((result) => result)

  console.log("\n" + "=".repeat(50))
  console.log(`🎯 Overall Status: ${allPassed ? "✅ READY FOR PRODUCTION" : "❌ NEEDS ATTENTION"}`)
  console.log("=".repeat(50))

  if (!allPassed) {
    console.log("\n📋 Next Steps:")
    console.log("- Fix failing tests above")
    console.log("- Review PRODUCTION_SETUP.md for detailed instructions")
    console.log("- Ensure all environment variables are set")
    console.log("- Verify OAuth applications are configured correctly")
  }

  process.exit(allPassed ? 0 : 1)
}

// Run tests if this script is executed directly
if (require.main === module) {
  runProductionTests().catch(console.error)
}

export { runProductionTests }
