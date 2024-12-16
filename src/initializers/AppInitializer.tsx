import AlertInitializer from './AlertInitializer';
import AuthInitializer from './AuthInitializer';
import JotaiInitializer from './JotaiInitializer';
import ThemeInitializer from './ThemeInitializer';

const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeInitializer>
      <AuthInitializer>
        <JotaiInitializer>
          <AlertInitializer>{children}</AlertInitializer>
        </JotaiInitializer>
      </AuthInitializer>
    </ThemeInitializer>
  );
};

export default AppInitializer;
