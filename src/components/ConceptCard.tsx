import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { format } from "date-fns";

export interface ConceptCardProps {
  id?: string;
  title?: string;
  content?: string;
  category?: "Physics" | "Chemistry" | "Biology" | "Other";
  createdAt?: Date;
  gradientColor?: string;
}

const getCategoryGradient = (category?: string) => {
  switch (category) {
    case "Physics":
      return "from-blue-500 to-purple-600";
    case "Chemistry":
      return "from-green-400 to-teal-500";
    case "Biology":
      return "from-red-400 to-pink-500";
    case "Other":
      return "from-yellow-400 to-orange-500";
    default:
      return "from-gray-400 to-gray-600";
  }
};

const ConceptCard: React.FC<ConceptCardProps> = ({
  title = "Quantum Mechanics",
  content = "The branch of physics that deals with the behavior of matter and light on the atomic and subatomic scale.",
  category = "Physics",
  createdAt = new Date(),
  gradientColor,
}) => {
  const gradient = gradientColor || getCategoryGradient(category);

  return (
    <Card
      className={`w-full h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br ${gradient} text-white`}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-bold truncate">{title}</CardTitle>
          <Badge
            variant="outline"
            className="bg-white/20 text-white border-none text-xs"
          >
            {category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm line-clamp-4">{content}</p>
          <div className="text-xs text-white/70 pt-2">
            {format(createdAt, "MMM d, yyyy")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConceptCard;
