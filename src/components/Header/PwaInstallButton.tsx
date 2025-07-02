'use client';

import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';
import { usePwaContext } from '@/initializers/PwaInitializer';

const PwaInstallButton = () => {
  const { deferredPrompt } = usePwaContext();

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    }
  };

  if (!deferredPrompt) return null;

  return (
    <MenuItem onClick={handleInstall}>
      <ListItemIcon>
        <InstallMobileIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Install</ListItemText>
    </MenuItem>
  );
};

export default PwaInstallButton;
