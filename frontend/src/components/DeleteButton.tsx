import React from 'react';
import { Trash2 } from 'lucide-react';
import './DeleteButton.css';

interface DeleteButtonProps {
  onClick: () => void;
  className?: string;
}

const DeleteButton: React.FC<DeleteButtonProps> = ({ onClick, className }) => {
  return (
    <button 
      className={`del-btn ${className || ''}`} 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Jegyzet törlése"
    >
      <div className="del-icon-wrapper">
        <Trash2 />
      </div>
    </button>
  );
};

export default DeleteButton;