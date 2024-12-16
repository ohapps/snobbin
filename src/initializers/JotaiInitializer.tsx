'use client';

import { Provider } from 'jotai';

const JotaiInitializer = ({ children }: { children: React.ReactNode }) => {
  return <Provider>{children}</Provider>;
};

export default JotaiInitializer;
