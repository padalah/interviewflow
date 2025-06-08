import React from 'react';
import { Building2, Users, Target, Zap, Heart, Code } from 'lucide-react';

interface CultureSelectorProps {
  selectedCulture: string;
  onCultureChange: (culture: string) => void;
}

const CultureSelector: React.FC<CultureSelectorProps> = ({
  selectedCulture,
  onCultureChange,
}) => {
  const cultures = [
    {
      id: 'startup',
      name: 'Startup',
      description: 'Fast-paced, innovative, risk-taking environment',
      icon: Zap,
      characteristics: ['Agility', 'Innovation', 'Risk-taking', 'Flat hierarchy'],
    },
    {
      id: 'corporate',
      name: 'Corporate',
      description: 'Structured, process-oriented, professional environment',
      icon: Building2,
      characteristics: ['Structure', 'Process', 'Hierarchy', 'Stability'],
    },
    {
      id: 'tech',
      name: 'Tech Company',
      description: 'Data-driven, engineering-focused, cutting-edge technology',
      icon: Code,
      characteristics: ['Data-driven', 'Technical excellence', 'Scale', 'Innovation'],
    },
    {
      id: 'collaborative',
      name: 'Collaborative',
      description: 'Team-focused, inclusive, consensus-building culture',
      icon: Users,
      characteristics: ['Teamwork', 'Inclusion', 'Consensus', 'Communication'],
    },
    {
      id: 'results_driven',
      name: 'Results-Driven',
      description: 'Performance-focused, goal-oriented, competitive environment',
      icon: Target,
      characteristics: ['Performance', 'Goals', 'Competition', 'Metrics'],
    },
    {
      id: 'mission_driven',
      name: 'Mission-Driven',
      description: 'Purpose-focused, social impact, values-based organization',
      icon: Heart,
      characteristics: ['Purpose', 'Impact', 'Values', 'Meaning'],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-medium text-gray-900">Company Culture</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Select the company culture that best matches your target organization to get more relevant interview questions and scenarios.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cultures.map((culture) => {
          const Icon = culture.icon;
          const isSelected = selectedCulture === culture.id;
          
          return (
            <button
              key={culture.id}
              onClick={() => onCultureChange(culture.id)}
              className={`p-4 border rounded-lg text-left transition-all hover:shadow-md ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${
                  isSelected ? 'bg-primary-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`h-5 w-5 ${
                    isSelected ? 'text-primary-600' : 'text-gray-600'
                  }`} />
                </div>
                <h4 className={`font-medium ${
                  isSelected ? 'text-primary-900' : 'text-gray-900'
                }`}>
                  {culture.name}
                </h4>
              </div>
              
              <p className={`text-sm mb-3 ${
                isSelected ? 'text-primary-700' : 'text-gray-600'
              }`}>
                {culture.description}
              </p>
              
              <div className="flex flex-wrap gap-1">
                {culture.characteristics.map((char) => (
                  <span
                    key={char}
                    className={`text-xs px-2 py-1 rounded-full ${
                      isSelected
                        ? 'bg-primary-200 text-primary-800'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {char}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      
      {selectedCulture && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <span className="font-medium">Selected: </span>
            {cultures.find(c => c.id === selectedCulture)?.name} culture. 
            Your interview questions will be tailored to match this environment.
          </p>
        </div>
      )}
    </div>
  );
};

export default CultureSelector;