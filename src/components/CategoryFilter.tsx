import React from 'react';
import type { CategoryFilterValue } from '../types';

interface CategoryFilterOption {
  id: CategoryFilterValue;
  label: string;
}

interface CategoryFilterProps {
  options: CategoryFilterOption[];
  activeCategory: CategoryFilterValue;
  onSelect: (category: CategoryFilterValue) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ options, activeCategory, onSelect }) => {
  return (
    <div className="category-filter">
      {options.map((category) => (
        <button
          key={category.id}
          className={`chip ${activeCategory === category.id ? 'chip-active' : ''}`}
          onClick={() => onSelect(category.id)}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
};
