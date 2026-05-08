export type ExplanationCategory = 'MEMORY' | 'EXECUTION' | 'GARBAGE_COLLECTION' | 'CLASS_LOADING';

export interface EducationalExplanation {
  id: string;
  category: ExplanationCategory;
  title: string;
  description: string;
  timestamp: number;
}

export class ExplanationEngine {
  private explanations: EducationalExplanation[] = [];
  private listeners: Set<(explanations: EducationalExplanation[]) => void> = new Set();

  public addExplanation(category: ExplanationCategory, title: string, description: string) {
    const explanation: EducationalExplanation = {
      id: `exp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      category,
      title,
      description,
      timestamp: Date.now()
    };
    
    this.explanations.push(explanation);
    
    // Keep only the most recent 5 explanations
    if (this.explanations.length > 5) {
      this.explanations.shift();
    }
    
    this.notifyListeners();
  }

  public clear() {
    this.explanations = [];
    this.notifyListeners();
  }

  public subscribe(listener: (explanations: EducationalExplanation[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l([...this.explanations]));
  }
}

export const explanationEngine = new ExplanationEngine();
