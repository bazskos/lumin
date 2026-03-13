import React from 'react';
import './CyberpunkInput.css';

interface CyberpunkInputProps {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  type?: 'text' | 'password' | 'textarea' | 'select'; 
  placeholder?: string;
  children?: React.ReactNode;
  required?: boolean;
}

const CyberpunkInput: React.FC<CyberpunkInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  children,
  required = false,
}) => {
  return (
    <div className="cp-wrapper">
      {}
      <div className="cp-bg-layer cp-glow"></div>
      <div className="cp-bg-layer cp-darkBg"></div>
      <div className="cp-bg-layer cp-darkBg"></div>
      <div className="cp-bg-layer cp-white"></div>
      <div className="cp-bg-layer cp-border"></div>

      {}
      <div className="cp-input-box">
        <label className="cp-label">{label}</label>
        
        {type === 'textarea' ? (
          <textarea
            className="cp-field"
            value={value}
            onChange={onChange as any}
            placeholder={placeholder}
            required={required}
          />
        ) : type === 'select' ? (
          <select
            className="cp-field"
            value={value}
            onChange={onChange as any}
            required={required}
          >
            {children}
          </select>
        ) : (
          <input
            type={type}
            className="cp-field"
            value={value}
            onChange={onChange as any}
            placeholder={placeholder}
            required={required}
          />
        )}
      </div>
    </div>
  );
};

export default CyberpunkInput;