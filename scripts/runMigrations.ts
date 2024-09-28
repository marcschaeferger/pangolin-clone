import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';

const runMigrations = async () => {
  // Create a new SQLite database connection
  const sqlite = new Database('./config/db/db.sqlite');

  // Create a Drizzle instance
  const db = drizzle(sqlite);

  console.log('Running migrations...');

  try {
    // Run the migrations
    await migrate(db, { migrationsFolder: './server/migrations' });
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    sqlite.close();
  }
};

runMigrations();