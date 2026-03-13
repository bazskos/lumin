import React from 'react';
import './PageLoader.css';

interface PageLoaderProps {
  text?: string;
}

const PageLoader: React.FC<PageLoaderProps> = ({ text = "ADATOK BETÖLTÉSE..." }) => {
  return (
    <div className="page-loader-overlay">
      <div className="matrix-loader">
        {/* 1. sor */}
        <div className="matrix-cell d-0"></div>
        <div className="matrix-cell d-1"></div>
        <div className="matrix-cell d-2"></div>
        
        {/* 2. sor */}
        <div className="matrix-cell d-1"></div>
        <div className="matrix-cell d-2"></div>
        <div className="matrix-cell d-3"></div>
        
        {/* 3. sor */}
        <div className="matrix-cell d-2"></div>
        <div className="matrix-cell d-3"></div>
        <div className="matrix-cell d-4"></div>
      </div>
      <div className="loading-text-matrix">{text}</div>
    </div>
  );
};

export default PageLoader;