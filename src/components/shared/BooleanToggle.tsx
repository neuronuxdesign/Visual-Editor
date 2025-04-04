import React from 'react';
import './BooleanToggle.scss';

interface BooleanToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: boolean;
  className?: string;
}

const BooleanToggle: React.FC<BooleanToggleProps> = ({
  value,
  onChange,
  label = true,
  className = ''
}) => {
  const handleToggle = () => {
    onChange(!value);
  };

  return (
    <div className={`boolean-toggle-container ${className}`}>
      <button 
        className={`boolean-toggle ${value ? 'true' : 'false'}`}
        onClick={handleToggle}
        type="button"
        aria-checked={value}
        role="switch"
      >
        <div className="toggle-track">
          <div className="toggle-indicator"></div>
        </div>
        {label && (
          <span className="toggle-label">{value ? 'True' : 'False'}</span>
        )}
      </button>
    </div>
  );
};

export default BooleanToggle; 