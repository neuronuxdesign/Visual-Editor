import React, { ReactNode } from 'react';

interface SharedLayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  mainContent: ReactNode;
  className?: string;
}

const SharedLayout: React.FC<SharedLayoutProps> = ({
  header,
  sidebar,
  mainContent,
  className = ''
}) => {
  return (
    <div className={`app-container ${className}`}>
      <div className="sidebar">
        {sidebar}
      </div>
      <div className="main-content">
        {header}
        <div className="main-area">
          {mainContent}
        </div>
      </div>
    </div>
  );
};

export default SharedLayout; 