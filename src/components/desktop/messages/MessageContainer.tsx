import React from "react";

interface MessageContainerProps {
  alignment: "left" | "right" | "center";
  colorScheme: string;
  children: React.ReactNode;
  customBgColor?: string;
}

export function MessageContainer({
  alignment,
  colorScheme,
  children,
  customBgColor,
}: MessageContainerProps) {
  const justifyClass =
    alignment === "right"
      ? "justify-end"
      : alignment === "center"
        ? "justify-center"
        : "justify-start";

  return (
    <div className={`mb-4 flex ${justifyClass}`}>
      <div
        className={`max-w-[95%] sm:max-w-[90%] rounded-lg ${alignment === "left" ? "px-0 py-1" : "px-4 py-3"} overflow-hidden break-words ${colorScheme}`}
        style={customBgColor ? { backgroundColor: customBgColor } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
