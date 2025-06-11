import { createContext, useContext, useState } from "react";

interface SidebarContextType {
  sideBarVisible: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext({} as SidebarContextType);

export const SidebarProvider = (props: { children: React.ReactNode }) => {
  const [sideBarVisible, setSideBarVisible] = useState(false);

  const toggleSidebar = () => {
    setSideBarVisible(!sideBarVisible);
  };
  return (
    <SidebarContext.Provider value={{ sideBarVisible, toggleSidebar }}>
      {props.children}
    </SidebarContext.Provider>
  );
};

export const useSidebarContext = () => {
  return useContext(SidebarContext);
};
