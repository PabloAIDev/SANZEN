export type AssistantResponseSource = 'openai' | 'fallback' | 'rules';

export interface AssistantAction {
  type: 'navigate';
  target: string;
  label: string;
}

export interface AssistantHistoryEntry {
  role: 'assistant' | 'user';
  text: string;
}

export interface AssistantResponse {
  message: string;
  actions: AssistantAction[];
  source?: AssistantResponseSource;
}

export interface AssistantMessage extends AssistantHistoryEntry {
  id: string;
  actions?: AssistantAction[];
}
