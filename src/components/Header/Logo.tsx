import { Box, styled } from "@mui/material";
import Image from "next/image";
import logoImage from "../../../public/logo.png";

export const LogoContainer = styled(Box)(({ theme }) => ({
  marginRight: theme.spacing(4),
}));

const Logo = () => {
  return (
    <LogoContainer>
      <Image src={logoImage} alt="logo" width={150} height={25} />
    </LogoContainer>
  );
};

export default Logo;
