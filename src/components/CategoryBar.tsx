import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type Category = "Physics" | "Chemistry" | "Biology" | "Other";

interface CategoryBarProps {
  selectedCategory?: Category;
  onCategoryChange?: (category: Category) => void;
}

const CategoryBar = ({
  selectedCategory = "Physics",
  onCategoryChange = () => {},
}: CategoryBarProps) => {
  const [activeCategory, setActiveCategory] =
    useState<Category>(selectedCategory);

  const categories: Category[] = ["Physics", "Chemistry", "Biology", "Other"];

  const handleCategoryClick = (category: Category) => {
    setActiveCategory(category);
    onCategoryChange(category);
  };

  return (
    <div className="w-full bg-theme py-3 px-4 flex items-center justify-center sticky top-0 z-10">
      <div className="flex space-x-2 overflow-x-auto max-w-full p-1">
        {categories.map((category) => (
          <Button
            key={category}
            variant={activeCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => handleCategoryClick(category)}
            className={cn(
              "transition-all duration-200",
              activeCategory === category ? "font-medium" : "font-normal",
            )}
          >
            {category}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default CategoryBar;
