import { Check } from "lucide-react";

interface AIModel {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  supportsImages?: boolean;
}

interface ModelPickerProps {
  models: AIModel[];
  selectedModel: string;
  onSelect: (modelId: string) => void;
  onClose: () => void;
}

const ModelPicker = ({ models, selectedModel, onSelect, onClose }: ModelPickerProps) => {
  const categories = [...new Set(models.map(m => m.category))];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-lg bg-card rounded-t-3xl border-t border-border max-h-[75vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <h3 className="text-lg font-bold text-foreground text-center mb-1 px-5">Choose AI Model 🤖</h3>
        <p className="text-xs text-muted-foreground text-center mb-4 px-5">Select the best model for your task</p>
        
        {categories.map(category => (
          <div key={category} className="mb-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-5 mb-2">{category}</p>
            <div className="space-y-0.5 px-3">
              {models.filter(m => m.category === category).map(model => (
                <button
                  key={model.id}
                  onClick={() => onSelect(model.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    selectedModel === model.id ? "bg-primary/10" : "hover:bg-accent/60"
                  }`}
                >
                  <span className="text-xl">{model.emoji}</span>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-semibold ${selectedModel === model.id ? "text-primary" : "text-foreground"}`}>{model.name}</p>
                    <p className="text-[11px] text-muted-foreground">{model.description}</p>
                  </div>
                  {selectedModel === model.id && <Check className="w-5 h-5 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="h-8" />
      </div>
    </div>
  );
};

export default ModelPicker;
