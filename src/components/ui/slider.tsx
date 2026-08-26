import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Minimal shadcn-style range slider. Hand-authored (like the other ui/
 * primitives in this project) rather than pulling in @radix-ui/react-slider,
 * since a native <input type="range"> is fully accessible and sufficient
 * for the single-thumb sliders this project needs.
 */
function Slider({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type="range"
      data-slot="slider"
      className={cn(
        "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Slider };
