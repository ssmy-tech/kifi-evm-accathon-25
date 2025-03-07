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
      // Apply pending migrations
      console.log('🔄 Applying migrations...');
      const migrateResult = await execAsync(`npx prisma migrate deploy --schema "${schemaPath}"`);
      console.log('Migration output:', migrateResult.stdout);
      if (migrateResult.stderr) console.error('Migration errors:', migrateResult.stderr);
    }

    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    const generateResult = await execAsync(`npx prisma generate --schema "${schemaPath}"`);
    console.log('Generate output:', generateResult.stdout);
    if (generateResult.stderr) console.error('Generate errors:', generateResult.stderr);

    // Verify database connection
    console.log('🔍 Verifying database connection...');
    const result = await prisma.$queryRaw<[{ current_database: string }]>`SELECT current_database()`;
    console.log('✅ Successfully connected to database:', result[0].current_database);

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