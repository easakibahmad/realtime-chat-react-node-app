import * as React from "react";
import {
  Select as RadixSelect,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@radix-ui/react-select";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

// Define styles using cva
const selectVariants = cva(
  "inline-flex items-center justify-between rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface SelectProps
  extends React.ComponentPropsWithoutRef<typeof RadixSelect>,
    VariantProps<typeof selectVariants> {
  className?: string;
  asChild?: boolean;
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return (
      <RadixSelect {...props}>
        <SelectTrigger
          className={cn(selectVariants({ variant, size }), className)}
          ref={ref}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </RadixSelect>
    );
  }
);

Select.displayName = "Select";

// SelectItem component for options
const SelectOption = React.forwardRef<
  React.ElementRef<typeof SelectItem>,
  React.ComponentPropsWithoutRef<typeof SelectItem>
>(({ children, ...props }, ref) => (
  <SelectItem ref={ref} {...props} className="px-2 py-1 hover:bg-accent">
    {children}
  </SelectItem>
));

SelectOption.displayName = "SelectOption";

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
