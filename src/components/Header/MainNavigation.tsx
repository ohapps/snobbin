import { AppRoutes } from "@/config/appRoutes";
import { Link, styled } from "@mui/material";

export const NavLink = styled(Link)(({ theme }) => ({
  margin: theme.spacing(2),
  textDecoration: "none",
  color: theme.palette.common.white,
}));

export const Container = styled("div")(({ theme }) => ({
  [theme.breakpoints.down("sm")]: {
    display: "none",
  },
  [theme.breakpoints.up("sm")]: {
    display: "block",
  },
}));

const MainNavigation = () => {
  return (
    <Container>
      <NavLink href={AppRoutes.ACTIVITY}>Activity</NavLink>
      <NavLink href={AppRoutes.GROUPS}>Groups</NavLink>
    </Container>
  );
};

export default MainNavigation;
