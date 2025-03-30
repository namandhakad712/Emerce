import React, { useState, useEffect } from "react";
import ConceptCard from "./ConceptCard";

interface ConceptCardProps {
  id?: string;
  title: string;
  content: string;
  category: string;
  createdAt: Date;
}

interface ConceptCardGridProps {
  selectedCategory?: string;
  cards?: ConceptCardProps[];
  isLoading?: boolean;
}

const ConceptCardGrid: React.FC<ConceptCardGridProps> = ({
  selectedCategory = "All",
  cards = [
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
  ],
  isLoading = false,
}) => {
  const [filteredCards, setFilteredCards] = useState<ConceptCardProps[]>(cards);

  useEffect(() => {
    if (selectedCategory === "All") {
      setFilteredCards(cards);
    } else {
      setFilteredCards(
        cards.filter((card) => card.category === selectedCategory),
      );
    }
  }, [selectedCategory, cards]);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-gray-100 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-gray-200 rounded-lg h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (filteredCards.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 p-6 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h3 className="text-xl font-medium text-gray-700 mb-2">
            No concept cards found
          </h3>
          <p className="text-gray-500">
            {selectedCategory === "All"
              ? "Start chatting with Emerce to generate concept cards!"
              : `No concept cards found in the ${selectedCategory} category.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-100 p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCards.map((card) => (
          <div key={card.id} className="h-48">
            <ConceptCard
              title={card.title}
              content={card.content}
              category={card.category}
              createdAt={card.createdAt}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConceptCardGrid;
