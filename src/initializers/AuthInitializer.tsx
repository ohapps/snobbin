import { checkForNewUser } from '@/server/utils/user/check-for-new-user';
import { getSession } from '@auth0/nextjs-auth0';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { redirect } from 'next/navigation';

const LoginCheck = async ({ children }: { children: React.ReactNode }) => {
  const session = await getSession();

  if (!session) {
    redirect('/api/auth/login');
  } else {
    await checkForNewUser(session);
  }

  return <>{children}</>;
};

const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  return (
    <UserProvider>
      <LoginCheck>{children}</LoginCheck>
    </UserProvider>
  );
};

export default AuthInitializer;
