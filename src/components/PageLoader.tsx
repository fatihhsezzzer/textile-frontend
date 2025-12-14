import React from "react";
import "./PageLoader.css";

interface PageLoaderProps {
  message?: string;
}

const PageLoader: React.FC<PageLoaderProps> = ({
  message = "Yükleniyor...",
}) => {
  return (
    <div className="page-loader-overlay">
      <div className="page-loader-content">
        <div className="page-loader-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <p className="page-loader-message">{message}</p>
      </div>
    </div>
  );
};

export default PageLoader;
