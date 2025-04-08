import React from "react";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import LogoutIcon from "@mui/icons-material/Logout";
import ProfileIcon from "@mui/icons-material/Person";
import { AppRoutes } from "@/config/appRoutes";
import { Link, styled } from "@mui/material";
import { useUser } from "@auth0/nextjs-auth0/client";
import { getCurrentUserInitials } from "@/utils/get-current-user-initials";

export const NavLink = styled(Link)(({ theme }) => ({
  textDecoration: "none",
  color: theme.palette.common.black,
  width: theme.spacing(12),
}));

export const Container = styled("div")(({ theme }) => ({
  [theme.breakpoints.down("sm")]: {
    display: "none",
  },
  [theme.breakpoints.up("sm")]: {
    display: "block",
  },
}));

const UserMenu = () => {
  const { user } = useUser();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
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
        onClick={handleClick}
        size="small"
        sx={{ ml: 2 }}
        aria-controls={open ? "account-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
      >
        <Avatar sx={{ width: 32, height: 32, fontSize: "12px" }}>
          {getCurrentUserInitials(user)}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
      >
        <MenuItem>
          <ListItemIcon>
            <ProfileIcon fontSize="small" />
          </ListItemIcon>
          <NavLink href={AppRoutes.PROFILE}>Profile</NavLink>
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <NavLink href={AppRoutes.LOGOUT}>Logout</NavLink>
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default UserMenu;
