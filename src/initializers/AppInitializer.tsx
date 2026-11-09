import AlertInitializer from "./AlertInitializer";
import AuthInitializer from "./AuthInitializer";
import JotaiInitializer from "./JotaiInitializer";
import { PwaProvider } from "./PwaInitializer";
import ThemeInitializer from "./ThemeInitializer";
import OfflineIdentitySync from "@/components/Offline/OfflineIdentitySync";
import OfflineReconnect from "@/components/Offline/OfflineReconnect";
import OfflineBootstrapInitializer from "./OfflineBootstrapInitializer";

const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeInitializer>
      <AuthInitializer>
        <JotaiInitializer>
          <AlertInitializer>
            <PwaProvider>
              <OfflineIdentitySync />
              <OfflineReconnect />
              <OfflineBootstrapInitializer />
              {children}
            </PwaProvider>
          </AlertInitializer>
        </JotaiInitializer>
      </AuthInitializer>
    </ThemeInitializer>
  );
};

export default AppInitializer;
