import React from 'react';
import { LogOut } from 'lucide-react';
import './LogoutButton.css';

interface LogoutButtonProps {
  onClick: () => void;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ onClick }) => {
  return (
    <button className="logoutBtn" onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <div className="sign">
        <LogOut />
      </div>
      <div className="text">Kilépés</div>
    </button>
  );
};

export default LogoutButton;