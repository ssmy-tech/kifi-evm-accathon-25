import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Get environment from NODE_ENV or default to 'dev'
const env = process.env.NODE_ENV || 'dev';
console.log(`🌍 Using environment: ${env}`);

// Load environment variables - ensure path is resolved relative to this script
const scriptDir = __dirname;
const projectRoot = path.resolve(scriptDir, '../..');
const envPath = path.resolve(scriptDir, `../environments/${env}/.env`);
const schemaPath = path.resolve(projectRoot, 'prisma/schema.prisma');

// Check if schema file exists
if (!fs.existsSync(schemaPath)) {
  console.error(`❌ Error: Prisma schema file not found at ${schemaPath}`);
  process.exit(1);
}

// Check if environment file exists
if (!fs.existsSync(envPath)) {
  console.error(`❌ Error: .env file not found at ${envPath}`);
  process.exit(1);
}

console.log(`📄 Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function main() {
  console.log(`🚀 Initializing ${env} environment...`);

  // Validate required environment variables
  if (!process.env.DATABASE_URL) {
    throw new Error(`DATABASE_URL is not set in the ${env} environment`);
  }

  try {
    // Change to project root directory
    process.chdir(projectRoot);
    
    // Check if we should reset the database
    const shouldReset = process.argv.includes('--reset');
    
    if (shouldReset) {
      console.log('🧹 Resetting database...');
      await execAsync(`npx prisma migrate reset --force --schema="${schemaPath}"`);
    } else {
      // Apply pending migrations
      console.log('🔄 Applying migrations...');
      await execAsync(`npx prisma migrate deploy --schema="${schemaPath}"`);
    }

    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    await execAsync(`npx prisma generate --schema="${schemaPath}"`);

    // Seed the database
    console.log('🌱 Seeding database...');
    const seedPath = path.resolve(projectRoot, `prisma/seeds/${env}.ts`);
    if (!fs.existsSync(seedPath)) {
      console.warn(`⚠️ Warning: Seed file not found at ${seedPath}`);
    } else {
      const seedModule = require(seedPath);
      await seedModule.seed(prisma);
    }

    console.log(`✅ ${env} environment initialized successfully!`);
  } catch (error) {
    console.error(`❌ Failed to initialize ${env} environment:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 