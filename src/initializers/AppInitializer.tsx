import AlertInitializer from "./AlertInitializer";
import AuthInitializer from "./AuthInitializer";
import JotaiInitializer from "./JotaiInitializer";
import { PwaProvider } from "./PwaInitializer";
import ThemeInitializer from "./ThemeInitializer";

const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeInitializer>
      <AuthInitializer>
        <JotaiInitializer>
          <AlertInitializer>
            <PwaProvider>{children}</PwaProvider>
          </AlertInitializer>
        </JotaiInitializer>
      </AuthInitializer>
    </ThemeInitializer>
  );
};

export default AppInitializer;
