const Dialog = ({ open, onOpenChange, children }) => {
    if (!open) return null;
  
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
          {children}
        </div>
      </div>
    );
  };
  
  export default Dialog;