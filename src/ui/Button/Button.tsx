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
  ...props
}) => {
  const buttonClass = `
    ui-button
    ui-button--${variant}
    ${danger ? 'ui-button--danger' : ''}
    ${className}
  `.trim();

  return (
    <button className={buttonClass} {...props}>
      {children}
    </button>
  );
};

export default Button; 