import React, { useState } from 'react';
import './VariableCreator.scss';
import ColorSelector from './ColorSelector';
import { CustomVariable } from '../types';
import MasterJSON from '../../../source/MasterJSON';
import { RGBAValue } from '../../../types/common';

interface VariableCreatorProps {
  collectionId: string;
  allVariables: CustomVariable[];
  onVariableCreated: () => void;
  onCancel: () => void;
}

const VariableCreator: React.FC<VariableCreatorProps> = ({
  collectionId,
  allVariables,
  onVariableCreated,
  onCancel
}) => {
  // Initial color value
  const initialColor: RGBAValue = { r: 0, g: 0, b: 0, a: 1 };
  
  // Variable data state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [valueType, setValueType] = useState<'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'>('STRING');
  const [stringValue, setStringValue] = useState('');
  const [floatValue, setFloatValue] = useState(0);
  const [booleanValue, setBooleanValue] = useState(false);
  const [colorValue, setColorValue] = useState<RGBAValue>(initialColor);
  
  // Validation state
  const [nameError, setNameError] = useState('');
  
  // Handle name change with validation
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    
    // Clear error when user types
    if (nameError) setNameError('');
  };
  
  // Handle creating a new variable
  const handleCreateVariable = () => {
    // Validate name
    if (!name.trim()) {
      setNameError('Variable name is required');
      return;
    }
    
    // Get value based on type
    let value: string | number | RGBAValue | boolean;
    
    switch (valueType) {
      case 'COLOR':
        value = colorValue;
        break;
      case 'FLOAT':
        value = floatValue;
        break;
      case 'BOOLEAN':
        value = booleanValue;
        break;
      case 'STRING':
      default:
        value = stringValue;
        break;
    }
    
    // Create the variable
    const variableId = MasterJSON.addVariable(
      name,
      valueType,
      value,
      collectionId,
      description
    );
    
    if (variableId) {
      // Save to localStorage
      MasterJSON.saveMasterData();
      
      // Notify parent component
      onVariableCreated();
    } else {
      setNameError('Failed to create variable');
    }
  };
  
  // Handle color value change
  const handleColorValueChange = (variable: CustomVariable, newValue: RGBAValue) => {
    setColorValue(newValue);
  };
  
  // Create a dummy variable for the color selector
  const dummyVariable: CustomVariable = {
    id: 'temp-color-var',
    name: name || 'New Color Variable',
    valueType: 'COLOR',
    value: colorValue,
    rawValue: colorValue,
    modeId: '1:0', // Using first mode
    collectionName: 'Custom Variables',
    collectionId: collectionId,
    fileId: 'master-json',
    isColor: true
  };
  
  return (
    <div className="variable-creator">
      <h2>Create New Variable</h2>
      
      <div className="form-group">
        <label htmlFor="variable-name">Name:</label>
        <input
          type="text"
          id="variable-name"
          value={name}
          onChange={handleNameChange}
          placeholder="Enter variable name"
          className={nameError ? 'error' : ''}
        />
        {nameError && <div className="error-message">{nameError}</div>}
      </div>
      
      <div className="form-group">
        <label htmlFor="variable-description">Description (optional):</label>
        <textarea
          id="variable-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter variable description"
          rows={2}
        />
      </div>
      
      <div className="form-group">
        <label>Type:</label>
        <div className="type-selector">
          <button 
            className={`type-btn ${valueType === 'STRING' ? 'active' : ''}`}
            onClick={() => setValueType('STRING')}
          >
            String
          </button>
          <button 
            className={`type-btn ${valueType === 'COLOR' ? 'active' : ''}`}
            onClick={() => setValueType('COLOR')}
          >
            Color
          </button>
          <button 
            className={`type-btn ${valueType === 'FLOAT' ? 'active' : ''}`}
            onClick={() => setValueType('FLOAT')}
          >
            Number
          </button>
          <button 
            className={`type-btn ${valueType === 'BOOLEAN' ? 'active' : ''}`}
            onClick={() => setValueType('BOOLEAN')}
          >
            Boolean
          </button>
        </div>
      </div>
      
      <div className="form-group">
        <label>Value:</label>
        {/* Render different input based on type */}
        {valueType === 'STRING' && (
          <input
            type="text"
            value={stringValue}
            onChange={(e) => setStringValue(e.target.value)}
            placeholder="Enter string value"
          />
        )}
        
        {valueType === 'FLOAT' && (
          <input
            type="number"
            value={floatValue}
            onChange={(e) => setFloatValue(parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        )}
        
        {valueType === 'BOOLEAN' && (
          <div className="boolean-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={booleanValue}
                onChange={(e) => setBooleanValue(e.target.checked)}
              />
              <span className="toggle-text">{booleanValue ? 'True' : 'False'}</span>
            </label>
          </div>
        )}
        
        {valueType === 'COLOR' && (
          <div className="color-picker-container">
            <ColorSelector
              variable={dummyVariable}
              allVariables={allVariables}
              onValueChange={handleColorValueChange}
            />
          </div>
        )}
      </div>
      
      <div className="form-actions">
        <button className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="create-btn" onClick={handleCreateVariable}>
          Create Variable
        </button>
      </div>
    </div>
  );
};

export default VariableCreator; 