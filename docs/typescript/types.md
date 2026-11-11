---
title: "TypeScript types"
sidebar_position: 12
description: "The types exported by each @talk2view/sdk entry point."
---

# TypeScript types

The SDK is written in TypeScript with strict mode. All types are exported:

```typescript
// Core types
import type {
  T2VConfig,
  User,
  ChatEvent,
  ChatMessage,
  ClientTool,
  ClientToolSchema,
  ToolHandler,
  TokenResponse,
  ToolCallInterrupt,
  ChatCompletionChunk,
  RegisterToolsResponse,
  UserSkill,
  RegisterSkillsResponse,
} from '@talk2view/sdk';

// Headless React types
import type {
  T2VProviderProps,
  UseT2VAuthResult,
  UseT2VChatResult,
  UseT2VToolsResult,
  UsePartnerConfigResult,
  UseUserPreferencesResult,
  DisplayMessage,
  ToolStep,
  PendingApproval,
} from '@talk2view/sdk/react';

// UI component types
import type {
  Talk2ViewProps,
  ChatPanelProps,
  ChatWidgetProps,
} from '@talk2view/sdk/ui';

// assistant-ui runtime
import { useTalk2ViewRuntime, useTalk2ViewRuntimeForClient } from '@talk2view/sdk/assistant-ui';
import type {
  UseTalk2ViewRuntimeOptions, // useTalk2ViewRuntime(options)
  Talk2ViewRuntimeOptions,    // useTalk2ViewRuntimeForClient(t2v, options)
} from '@talk2view/sdk/assistant-ui';
```
