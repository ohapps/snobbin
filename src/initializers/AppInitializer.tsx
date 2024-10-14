import AuthInitializer from './AuthInitializer';

const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  return <AuthInitializer>{children}</AuthInitializer>;
};

export default AppInitializer;
