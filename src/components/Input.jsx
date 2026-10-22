import React from "react";
import { cn } from "../lib/utils";

const Input = React.forwardRef(
  ({ label, description, className, error, ...props }, ref) => (
    <div className="space-y-2">
      {label ? <label className="field-label block">{label}</label> : null}

      <input
        ref={ref}
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
  )
);

Input.displayName = "Input";

export { Input };
