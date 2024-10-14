import UserInfo from '@/components/User/UserInfo';
import { db } from '@/db';
import { snobsTable } from '@/db/schema';

export default async function Home() {
  const snobs = await db.select().from(snobsTable);
  console.log('snobs', snobs);
  return (
    <div>
      <UserInfo />
    </div>
  );
}
