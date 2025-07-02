import {
  IconButton,
  Link,
  ListItemIcon,
  Menu,
  MenuItem,
  styled,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { AppRoutes } from "@/config/appRoutes";
import { useState } from "react";
import LogoutIcon from "@mui/icons-material/Logout";
import ProfileIcon from "@mui/icons-material/Person";
import GroupsIcon from "@mui/icons-material/People";
import ActivityIcon from "@mui/icons-material/Assessment";
import PwaInstallButton from "@/components/Header/PwaInstallButton";

export const NavLink = styled(Link)(({ theme }) => ({
  textDecoration: "none",
  color: theme.palette.common.black,
  width: theme.spacing(12),
}));

export const Container = styled("div")(({ theme }) => ({
  [theme.breakpoints.down("sm")]: {
    display: "block",
  },
  [theme.breakpoints.up("sm")]: {
    display: "none",
  },
}));

const NavigationMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Container>
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        sx={{ mr: 2 }}
        onClick={handleClick}
      >
        <MenuIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
      >
        <MenuItem>
          <ListItemIcon>
            <ActivityIcon fontSize="small" />
          </ListItemIcon>
          <NavLink href={AppRoutes.ACTIVITY}>Activity</NavLink>
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <GroupsIcon fontSize="small" />
          </ListItemIcon>
          <NavLink href={AppRoutes.GROUPS}>Groups</NavLink>
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <ProfileIcon fontSize="small" />
          </ListItemIcon>
          <NavLink href={AppRoutes.PROFILE}>Profile</NavLink>
        </MenuItem>
        <PwaInstallButton />
        <MenuItem href="/api/auth/logout">
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default NavigationMenu;
