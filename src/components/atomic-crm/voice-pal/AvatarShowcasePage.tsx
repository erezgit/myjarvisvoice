import { Suspense } from "react";
import { Avatar3D } from "./Avatar3D";

export function AvatarShowcasePage() {
  return (
    <div className="h-full flex flex-col bg-background p-6">
      <h1 className="text-lg font-bold text-foreground mb-4">3D Avatar Showcase</h1>
      <div className="flex-1 rounded-xl overflow-hidden">
        <Suspense fallback={<div className="w-full h-full bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">Loading 3D character...</div>}>
          <Avatar3D isSpeaking={false} />
        </Suspense>
      </div>
    </div>
  );
}

AvatarShowcasePage.path = "/avatar-showcase";
