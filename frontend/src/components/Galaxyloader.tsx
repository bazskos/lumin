import React from 'react';
import './Galaxyloader.css';

const Galaxyloader: React.FC = () => {
  const text = "GENERÁLÁS...";
  const letters = text.split("");

  return (
    <div className="galaxy-overlay">
      <div className="loader-wrapper">
        <div className="loader"></div>
        <div className="loader-text">
            {letters.map((char, index) => (
                <span key={index} className="loader-letter">
                    {char}
                </span>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Galaxyloader;