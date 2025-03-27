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
  // Check if the values are already in the 0-255 range
  // If r, g, b are all >= 1, we can assume they're already in 0-255 range
  // and don't need to be multiplied by 255
  const isAlreadyInRgbRange = color.r > 1 || color.g > 1 || color.b > 1;
  
  // Use values directly if they're already in 0-255 range
  const r = isAlreadyInRgbRange ? Math.round(color.r) : Math.round(color.r * 255);
  const g = isAlreadyInRgbRange ? Math.round(color.g) : Math.round(color.g * 255);
  const b = isAlreadyInRgbRange ? Math.round(color.b) : Math.round(color.b * 255);
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
          rgba({Math.round(color.r > 1 ? color.r : color.r * 255)}, 
               {Math.round(color.g > 1 ? color.g : color.g * 255)}, 
               {Math.round(color.b > 1 ? color.b : color.b * 255)}, 
               {color.a || 1})
        </span>
      )}
    </div>
  );
};

export default ColorPreview; 