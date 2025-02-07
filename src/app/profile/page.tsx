import { getCurrentUser } from '@/server/utils/user/get-current-user';
import EditProfileForm from '@/components/Profile/EditProfileForm';

const Page = async () => {
  const snob = await getCurrentUser();
  return (
    <>
      <EditProfileForm snob={snob} />
    </>
  );
};

export default Page;
