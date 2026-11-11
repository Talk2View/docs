---
title: "Full integration example"
sidebar_position: 11
description: "A complete example of Talk2View in a hypothetical drawing app, built on the /ui components."
---

# Full integration example

Here's a complete example integrating Talk2View into a hypothetical drawing app:

```tsx
import React, { useRef, useMemo } from 'react';
import { Talk2View, ChatPanel } from '@talk2view/sdk/ui';
import type { ClientTool } from '@talk2view/sdk';
import { Canvas } from './Canvas';

function App() {
  const canvasRef = useRef<CanvasAPI>(null);

  const tools: ClientTool[] = useMemo(() => [
    {
      name: 'draw_circle',
      description: 'Draw a circle on the canvas',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate' },
          y: { type: 'number', description: 'Y coordinate' },
          radius: { type: 'number', description: 'Radius in pixels' },
          color: { type: 'string', description: 'Fill color' },
        },
        required: ['x', 'y', 'radius', 'color'],
      },
      execute: async (args) => {
        canvasRef.current!.drawCircle(
          args.x as number,
          args.y as number,
          args.radius as number,
          args.color as string,
        );
        return JSON.stringify({ success: true });
      },
    },
    {
      name: 'clear_canvas',
      description: 'Clear all drawings from the canvas',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        canvasRef.current!.clear();
        return JSON.stringify({ success: true });
      },
    },
    {
      name: 'get_canvas_info',
      description: 'Get the current canvas dimensions and number of shapes',
      parameters: { type: 'object', properties: {} },
      return_direct: true,
      execute: async () => {
        const info = canvasRef.current!.getInfo();
        return JSON.stringify(info);
      },
    },
  ], []);

  return (
    <Talk2View
      partnerKey="pk_live_..."
      tools={tools}
      systemPrompt="You control a drawing canvas. Use the tools to draw shapes and manage the canvas."
    >
      <div style={{ display: 'flex', height: '100vh' }}>
        <Canvas ref={canvasRef} style={{ flex: 1 }} />
        <div style={{ width: 360 }}>
          <ChatPanel welcome={{ heading: 'What should I draw?' }} />
        </div>
      </div>
    </Talk2View>
  );
}
```
