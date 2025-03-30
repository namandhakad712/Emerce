import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CategoryBar from "@/components/CategoryBar";
import ConceptCardGrid from "@/components/ConceptCardGrid";

// Define the Category type locally
type Category = "Physics" | "Chemistry" | "Biology" | "Other";

interface ConceptCardsPageProps {
  // Props can be added here if needed
}

const ConceptCardsPage: React.FC<ConceptCardsPageProps> = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category>("Physics");

  // Mock data for concept cards
  const mockCards = [
    {
      id: "1",
      title: "Quantum Mechanics",
      content:
        "The branch of physics that deals with the behavior of matter and light on the atomic and subatomic scale.",
      category: "Physics",
      createdAt: new Date(2023, 2, 15),
    },
    {
      id: "2",
      title: "Organic Chemistry",
      content:
        "The study of the structure, properties, composition, reactions, and preparation of carbon-containing compounds.",
      category: "Chemistry",
      createdAt: new Date(2023, 3, 10),
    },
    {
      id: "3",
      title: "Cell Theory",
      content:
        "A scientific theory that describes the properties of cells, primarily that the cell is the basic unit of life.",
      category: "Biology",
      createdAt: new Date(2023, 4, 5),
    },
    {
      id: "4",
      title: "Calculus",
      content:
        "The mathematical study of continuous change, in the same way that geometry is the study of shape and algebra is the study of generalizations of arithmetic operations.",
      category: "Other",
      createdAt: new Date(2023, 5, 20),
    },
    {
      id: "5",
      title: "Thermodynamics",
      content:
        "The branch of physics that deals with the relationships between heat and other forms of energy.",
      category: "Physics",
      createdAt: new Date(2023, 6, 12),
    },
    {
      id: "6",
      title: "Photosynthesis",
      content:
        "The process by which green plants and some other organisms use sunlight to synthesize nutrients from carbon dioxide and water.",
      category: "Biology",
      createdAt: new Date(2023, 7, 8),
    },
  ];

  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
  };

  const handleBackClick = () => {
    navigate("/"); // Navigate back to the chat page
  };

  return (
    <div className="flex flex-col h-screen w-full bg-theme">
      {/* Header with back button */}
      <div className="flex items-center p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBackClick}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Concept Cards</h1>
      </div>

      {/* Category filter bar */}
      <CategoryBar
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      {/* Concept cards grid */}
      <div className="flex-1 overflow-auto">
        <ConceptCardGrid
          selectedCategory={selectedCategory}
          cards={mockCards.map((card) => ({
            ...card,
            category: card.category as Category,
          }))}
        />
      </div>
    </div>
  );
};

export default ConceptCardsPage;
