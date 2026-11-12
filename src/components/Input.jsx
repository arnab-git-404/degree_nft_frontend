import React, { useId } from "react";
import { cn } from "../lib/utils";

const Input = React.forwardRef(
  ({ label, description, className, error, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="space-y-1.5">
        {label ? (
          <label htmlFor={inputId} className="field-label block">
            {label}
          </label>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={cn(
            "input-field",
            error && "border-red-600 focus:border-red-600",
            className
          )}
          {...props}
        />

        {description ? (
          <p className="text-xs leading-5 text-ink/50">{description}</p>
        ) : null}

        {error ? (
          <p className="text-xs font-medium text-red-700">{error}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
