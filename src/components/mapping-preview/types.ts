import { 
  Variable, 
  FigmaVariablesData, 
  SelectOption 
} from '../../types/common';

/**
 * Props for the MappingPreview component
 */
export interface MappingPreviewProps {
  figmaData: FigmaVariablesData | null;
  modeMapping: {[modeId: string]: string};
  selectedModes: Array<{modeId: string, name: string}>;
  allVariables: Variable[];
  selectedBrand: SelectOption[];
  selectedGrade: SelectOption;
  selectedDevice: SelectOption;
  selectedThemes: SelectOption[];
} 