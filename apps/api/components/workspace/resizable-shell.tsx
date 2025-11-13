"use client";

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

type Props = {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
};

export function ResizableShell({ left, center, right }: Props) {
  return (
    <div className="h-[calc(100vh-5.5rem)] w-full border">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        <ResizablePanel defaultSize={20} minSize={5} className="border-r">
          <div className="h-full">{left}</div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={20} className="border-r">
          <div className="h-full">{center}</div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={30} minSize={5}>
          <div className="h-full">{right}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

