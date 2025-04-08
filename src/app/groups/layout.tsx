import GroupDrawer from "@/components/Group/GroupDrawer";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <GroupDrawer />
    </>
  );
};

export default Layout;
