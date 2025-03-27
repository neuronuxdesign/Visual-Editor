import React from 'react';
import './Button.scss';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outlined';
  danger?: boolean;
  className?: string;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  danger = false,
  className = '',
  children,
  disabled = false,
  ...props
}) => {
  const buttonClass = `
    ui-button
    ui-button--${variant}
    ${danger ? 'ui-button--danger' : ''}
    ${disabled ? 'ui-button--disabled' : ''}
    ${className}
  `.trim();

  return (
    <button className={buttonClass} disabled={disabled} {...props}>
      {children}
    </button>
  );
};

export default Button; 