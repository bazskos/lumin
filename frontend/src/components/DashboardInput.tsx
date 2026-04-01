import React from 'react';
import { ChevronDown } from 'lucide-react';

interface DashboardInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  type?: 'text' | 'textarea' | 'select';
  placeholder?: string;
  children?: React.ReactNode;
  required?: boolean;
}

const DashboardInput: React.FC<DashboardInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  children,
  required = false,
}) => {
  
  const baseStyle = "w-full bg-[#1e293b] text-white text-sm border border-slate-700 rounded-xl px-4 py-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200 placeholder:text-slate-500 hover:border-slate-600";

  return (
    <div className="w-full">
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
        {label}
      </label>
      
      <div className="relative">
        {type === 'textarea' ? (
          <textarea
            className={`${baseStyle} min-h-[120px] resize-none leading-relaxed`}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
          />
        ) : type === 'select' ? (
          <div className="relative">
            <select
              className={`${baseStyle} appearance-none cursor-pointer`}
              value={value}
              onChange={onChange}
              required={required}
            >
              {children}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4"/>
            </div>
          </div>
        ) : (
          <input
            type={type}
            className={baseStyle}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardInput;