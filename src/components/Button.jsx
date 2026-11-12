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
        "inline-flex items-center justify-center gap-2 bg-acid px-5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink transition-colors hover:bg-ink hover:text-acid disabled:pointer-events-none disabled:opacity-50",
      ink: "inline-flex items-center justify-center gap-2 bg-ink px-5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper transition-colors hover:bg-cobalt disabled:pointer-events-none disabled:opacity-50",
    };

    const sizes = {
      sm: "h-8 px-3",
      md: "h-11",
      lg: "h-12 px-6 text-[11px]",
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
