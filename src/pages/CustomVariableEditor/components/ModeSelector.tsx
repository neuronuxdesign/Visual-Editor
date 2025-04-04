import React from 'react';
import Select from 'react-select';
import { VariableMode } from '../types';

interface ModeSelectorProps {
  modes: VariableMode[];
  selectedMode: string;
  onModeSelect: (modeId: string) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({
  modes,
  selectedMode,
  onModeSelect
}) => {
  if (modes.length === 0) return null;
  
  return (
    <div className="mode-selector">
      <Select
        value={modes.find(m => m.modeId === selectedMode)}
        onChange={(option) => onModeSelect(option?.modeId || '')}
        options={modes}
        getOptionLabel={(option) => option.name}
        getOptionValue={(option) => option.modeId}
        placeholder="Select mode"
      />
    </div>
  );
};

export default ModeSelector; 