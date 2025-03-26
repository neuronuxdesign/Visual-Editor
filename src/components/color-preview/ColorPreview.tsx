import React from 'react';
import './ColorPreview.scss';
import { RGBAValue } from '../../pages/VisualEditor/types';

interface ColorPreviewProps {
  color: RGBAValue;
  size?: 'small' | 'medium' | 'large';
  showValue?: boolean;
  className?: string;
}

// Helper function to get RGBA string from an RGBA value
export const getRgbaString = (color: RGBAValue): string => {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a || 1;

  return `rgba(${r}, ${g}, ${b}, ${a || 1})`;
};

const ColorPreview: React.FC<ColorPreviewProps> = ({
  color,
  size = 'medium',
  showValue = false,
  className = ''
}) => {
  // Determine size dimensions
  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { width: '16px', height: '16px' };
      case 'large':
        return { width: '24px', height: '24px' };
      case 'medium':
      default:
        return { width: '20px', height: '20px' };
    }
  };

  const dimensions = getDimensions();
  
  return (
    <div className={`color-preview-container ${size} ${className}`}>
      <div 
        className="color-preview"
        style={{
          backgroundColor: getRgbaString(color),
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: '4px',
          border: '1px solid #ddd',
          display: 'inline-block',
          marginRight: showValue ? '8px' : '0',
          verticalAlign: 'middle'
        }}
      />

      {showValue && (
        <span className="rgba-value">
          rgba({Math.round(color.r)}, {Math.round(color.g)}, {Math.round(color.b)}, {color.a || 1})
        </span>
      )}
    </div>
  );
};

export default ColorPreview; 