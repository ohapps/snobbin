import HeaderBar from './HeaderBar';
import { getCurrentUser } from '@/server/utils/user/get-current-user';

export const TopHeader = async () => {
  const snob = await getCurrentUser();
  return (
    <>
      <HeaderBar snob={snob} />
    </>
  );
};

export default TopHeader;
