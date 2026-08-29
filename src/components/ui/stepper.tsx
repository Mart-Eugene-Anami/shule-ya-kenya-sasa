
import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepProps {
  title: string;
  description?: string;
  isActive?: boolean;
  isCompleted?: boolean;
  stepNumber: number;
}

export const Step = ({
  title,
  description,
  isActive = false,
  isCompleted = false,
  stepNumber,
}: StepProps) => {
  return (
    <div className="flex items-center">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border-2",
          isActive && "border-primary bg-primary text-primary-foreground",
          isCompleted && "border-primary bg-primary text-primary-foreground",
          !isActive && !isCompleted && "border-muted-foreground text-muted-foreground"
        )}
      >
        {isCompleted ? (
          <Check className="h-6 w-6" />
        ) : (
          <span>{stepNumber}</span>
        )}
      </div>
      <div className="ml-4">
        <p
          className={cn(
            "text-sm font-medium",
            isActive && "text-foreground",
            isCompleted && "text-foreground",
            !isActive && !isCompleted && "text-muted-foreground"
          )}
        >
          {title}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
};

interface StepperProps {
  steps: {
    title: string;
    description?: string;
  }[];
  currentStep: number;
  className?: string;
}

export const Stepper = ({
  steps,
  currentStep,
  className,
}: StepperProps) => {
  return (
    <div className={cn("flex flex-col space-y-4", className)}>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <Step
            title={step.title}
            description={step.description}
            isActive={currentStep === index}
            isCompleted={currentStep > index}
            stepNumber={index + 1}
          />
          {index < steps.length - 1 && (
            <div className="ml-5 h-8 w-0.5 bg-border" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
