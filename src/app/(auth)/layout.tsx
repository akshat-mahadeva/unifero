import React from "react";

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-dvh  flex flex-col items-center justify-center w-full p-4">
      {children}
    </div>
  );
};

export default layout;
