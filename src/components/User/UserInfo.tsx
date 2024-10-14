'use client';

import { useUser } from '@auth0/nextjs-auth0/client';

const UserInfo = () => {
  const { user, error, isLoading } = useUser();
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    user && (
      <div>
        {user.picture && user.name && (
          <img src={user.picture} alt={user.name} />
        )}
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <a href="/api/auth/logout">Logout</a>
      </div>
    )
  );
};

export default UserInfo;
