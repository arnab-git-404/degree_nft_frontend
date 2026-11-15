import React from "react";
import { cn } from "../lib/utils";

const Button = React.forwardRef(
  (
    {
      className,
      variant = "default",
      size = "md",
      isLoading,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      default: "btn-primary",
      secondary: "btn-outline",
      outline: "btn-outline",
      ghost: "btn-ghost",
      acid:
        "inline-flex items-center justify-center gap-1.5 rounded-md bg-acid px-3 text-[13px] font-medium text-cobalt transition-colors hover:bg-cobalt/20 disabled:pointer-events-none disabled:opacity-50",
      ink: "inline-flex items-center justify-center gap-1.5 rounded-md bg-ink px-3 text-[13px] font-medium text-white transition-colors hover:bg-ink/85 disabled:pointer-events-none disabled:opacity-50",
    };

    const sizes = {
      sm: "h-7 px-2.5 text-xs",
      md: "h-8",
      lg: "h-9 px-4",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors disabled:cursor-not-allowed",
          variants[variant] || variants.default,
          sizes[size],
          isLoading && "cursor-not-allowed opacity-70",
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
