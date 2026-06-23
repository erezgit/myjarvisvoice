import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-blue-200 to-violet-200" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-transparent bg-transparent ring-offset-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-transparent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
