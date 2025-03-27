import { Variable, RGBAValue } from '../../types/common';

/**
 * Interface for dropdown variable options
 */
export interface VariableOption {
  label: string;
  value: string;
  original: Variable | null;
  isCustom?: boolean;
  type: string;
  color?: RGBAValue;
}

/**
 * Props for the VariableDropdown component
 */
export interface VariableDropdownProps {
  variable: Variable;
  allVariables: Variable[];
  onValueChange: (variable: Variable, newValue: string | RGBAValue, isReference?: boolean, refVariable?: Variable) => void;
  valueOnly?: boolean;
  onSave?: (variable: Variable) => void;
} 