import AlertInitializer from './AlertInitializer';
import AuthInitializer from './AuthInitializer';
import ThemeInitializer from './ThemeInitializer';

const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeInitializer>
      <AuthInitializer>
        <AlertInitializer>{children}</AlertInitializer>
      </AuthInitializer>
    </ThemeInitializer>
  );
};

export default AppInitializer;
