import { Snob } from '@/types/snob';
import Avatar from '@mui/material/Avatar';

export default function ProfileAvatar({
  snob,
  size,
  imaageOverrideUrl,
}: {
  snob: Snob;
  size: 'small' | 'large';
  imaageOverrideUrl?: string;
}) {
  const style =
    size === 'large'
      ? { width: 120, height: 120, fontSize: '48px' }
      : { width: 32, height: 32, fontSize: '12px' };

  const fallbackText =
    snob.firstName && snob.lastName
      ? `${snob.firstName.charAt(0).toUpperCase()}${snob.lastName.charAt(0).toUpperCase()}`
      : snob.email.charAt(0).toUpperCase();

  return (
    <Avatar
      alt="profile picture"
      src={imaageOverrideUrl ?? snob.pictureUrl ?? ''}
      sx={style}
    >
      {fallbackText}
    </Avatar>
  );
}
