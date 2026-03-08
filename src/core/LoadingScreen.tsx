const LoadingScreen = ({ module }: { module?: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      {module && (
        <p className="text-xs text-muted-foreground">Loading {module}...</p>
      )}
    </div>
  </div>
);

export default LoadingScreen;
