import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';

const envPath = path.resolve(__dirname, '.env');
console.log('Looking for .env file at:', envPath);

if (!existsSync(envPath)) {
  console.error('❌ Error: .env file not found at', envPath);
  console.log('Please create the file with your DATABASE_URL');
  process.exit(1);
}

// Load dev environment variables
dotenv.config({ path: envPath });

const execAsync = promisify(exec);
const prisma = new PrismaClient();
const schemaPath = path.resolve(__dirname, '../../schema.prisma');

async function main() {
  console.log('🚀 Initializing development environment...');
  console.log('Using schema at:', schemaPath);

  // Validate required environment variables
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in the dev environment');
  }
  console.log('Using database URL:', process.env.DATABASE_URL);

  try {
    // Check if we should reset the database
    const shouldReset = process.argv.includes('--reset');
    
    if (shouldReset) {
      console.log('🧹 Resetting database...');
      const resetResult = await execAsync(`npx prisma migrate reset --force --schema "${schemaPath}"`);
      console.log('Reset output:', resetResult.stdout);
      if (resetResult.stderr) console.error('Reset errors:', resetResult.stderr);
    } else {
      // Create and apply initial migration
      console.log('📝 Creating and applying migration...');
      try {
        const migrationResult = await execAsync(`npx prisma migrate dev --name init --schema "${schemaPath}"`);
        console.log('Migration output:', migrationResult.stdout);
        if (migrationResult.stderr) console.error('Migration errors:', migrationResult.stderr);
      } catch (error) {
        console.error('Migration creation failed:', error);
        // If migration fails, try deploying existing migrations
        console.log('Attempting to deploy existing migrations...');
        const deployResult = await execAsync(`npx prisma migrate deploy --schema "${schemaPath}"`);
        console.log('Migration deploy output:', deployResult.stdout);
        if (deployResult.stderr) console.error('Migration deploy errors:', deployResult.stderr);
      }
    }

    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    const generateResult = await execAsync(`npx prisma generate --schema "${schemaPath}"`);
    console.log('Generate output:', generateResult.stdout);
    if (generateResult.stderr) console.error('Generate errors:', generateResult.stderr);

    // Verify database connection and schema
    console.log('🔍 Verifying database connection and schema...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name != '_prisma_migrations'
      ORDER BY table_name
    `;
    console.log('✅ Database tables:', tables);

    console.log('✅ Development environment initialized successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize development environment:', error);
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