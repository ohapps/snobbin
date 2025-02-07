import UserInfo from '@/components/User/UserInfo';
import { db } from '@/server/db';
import { snobsTable } from '@/server/db/schema';

export default async function Home() {
  const snobs = await db.select().from(snobsTable);
  console.log('snobs', snobs);
  return (
    <div>
      <UserInfo />
    </div>
  );
}
