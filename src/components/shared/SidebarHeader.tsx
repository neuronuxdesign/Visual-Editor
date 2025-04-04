import React, { ReactNode } from 'react';

interface SidebarHeaderProps {
  logo: string;
  spaceIndicator?: ReactNode;
  additionalContent?: ReactNode;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  logo,
  spaceIndicator,
}) => {
  return (
    <div className="sidebar-header">
      <img src={logo} alt="Logo" className="sidebar-logo" />
      {spaceIndicator}
    </div>
  );
};

export default SidebarHeader; 