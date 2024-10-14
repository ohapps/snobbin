import postgres from "postgres";
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);

const main = async () => {
    try {
        await migrate(db, { migrationsFolder: 'migrations' });
        console.log('Migration completed');
    } catch (error) {
        console.error('Error during migration:', error);
        process.exit(1);
    }
};

main();