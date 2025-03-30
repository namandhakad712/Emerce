import React, { useState } from "react";
import { Settings, Check } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Separator } from "./ui/separator";

interface ModelOption {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
}

interface ModelSelectionMenuProps {
  selectedModel?: string;
  onModelSelect?: (modelId: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ModelSelectionMenu = ({
  selectedModel = "gemini-pro",
  onModelSelect = () => {},
  isOpen = false,
  onOpenChange = () => {},
}: ModelSelectionMenuProps) => {
  const [open, setOpen] = useState(isOpen);
  const [selected, setSelected] = useState(selectedModel);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange(newOpen);
  };

  const handleModelSelect = (modelId: string) => {
    setSelected(modelId);
    onModelSelect(modelId);
  };

  const modelOptions: ModelOption[] = [
    {
      id: "gemini-pro",
      name: "Gemini Pro",
      description: "Balanced model for general academic questions",
      capabilities: [
        "Text generation",
        "Academic research",
        "Concept explanation",
      ],
    },
    {
      id: "gemini-pro-vision",
      name: "Gemini Pro Vision",
      description: "Enhanced model with image understanding capabilities",
      capabilities: [
        "Text generation",
        "Image analysis",
        "Visual problem solving",
      ],
    },
    {
      id: "gemini-ultra",
      name: "Gemini Ultra",
      description: "Advanced model with superior reasoning abilities",
      capabilities: [
        "Complex problem solving",
        "Detailed explanations",
        "Advanced reasoning",
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="bg-white/10 rounded-full"
        >
          <Settings className="h-5 w-5" />
          <span className="sr-only">Select AI Model</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Select AI Model
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-500 mb-4">
            Choose the Gemini model that best suits your academic needs.
          </p>
          <RadioGroup
            value={selected}
            onValueChange={handleModelSelect}
            className="space-y-3"
          >
            {modelOptions.map((model) => (
              <motion.div
                key={model.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative rounded-xl border p-4 cursor-pointer ${selected === model.id ? "border-primary bg-accent" : "border-gray-200"}`}
                onClick={() => handleModelSelect(model.id)}
              >
                <div className="flex items-start gap-4">
                  <RadioGroupItem
                    value={model.id}
                    id={model.id}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={model.id}
                      className="text-base font-medium cursor-pointer flex items-center gap-2"
                    >
                      {model.name}
                      {selected === model.id && (
                        <Check className="h-4 w-4 text-blue-500" />
                      )}
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      {model.description}
                    </p>
                    <div className="mt-2">
                      <Separator className="my-2" />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {model.capabilities.map((capability, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {capability}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </RadioGroup>
        </div>
        <div className="flex justify-end gap-3 mt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onModelSelect(selected);
              handleOpenChange(false);
            }}
          >
            Confirm Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModelSelectionMenu;
