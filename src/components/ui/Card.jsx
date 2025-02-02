const Card = ({ children, className = "" }) => {
    return (
      <div className={`bg-white rounded-lg shadow-md ${className}`}>
        {children}
      </div>
    );
  };
  
  const CardHeader = ({ children, className = "" }) => {
    return (
      <div className={`p-4 border-b ${className}`}>
        {children}
      </div>
    );
  };
  
  const CardTitle = ({ children, className = "" }) => {
    return (
      <h3 className={`text-lg font-semibold ${className}`}>
        {children}
      </h3>
    );
  };
  
  const CardContent = ({ children, className = "" }) => {
    return (
      <div className={`p-4 ${className}`}>
        {children}
      </div>
    );
  };
  
  // Csak egy export statement a fájl végén
  export { 
    Card as default,
    CardHeader,
    CardTitle,
    CardContent 
  };