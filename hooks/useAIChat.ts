import { useState, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface UseAIChatOptions {
  systemPromptKey?: string;
  context?: any;
  onComplete?: (fullResponse: string) => void;
  workItemId?: string;
  conversationType?: string;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string, retryCount = 0) => {
      if (isStreaming) return;

      // Add user message
      const newUserMessage: Message = {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      };

      // Use a ref to capture current messages before state update
      let currentMessages: Message[] = [];
      setMessages((prev) => {
        currentMessages = [...prev, newUserMessage];
        return currentMessages;
      });

      setIsStreaming(true);
      setStreamingText('');
      setError(null);

      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: currentMessages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            systemPromptKey: options.systemPromptKey,
            context: options.context,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('Failed to get AI response');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (!reader) {
          throw new Error('No response body');
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullResponse += parsed.text;
                  setStreamingText(fullResponse);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }

        // Add assistant message
        const assistantMessage: Message = {
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingText('');
        setIsStreaming(false);

        if (options.onComplete) {
          options.onComplete(fullResponse);
        }
      } catch (err) {
        console.error('AI chat error:', err);
        let errorMsg = 'An error occurred';
        let shouldRetry = false;
        
        if (err instanceof Error) {
          // Handle abort/timeout
          if (err.name === 'AbortError') {
            errorMsg = 'Request timed out. The AI is taking longer than expected.';
            shouldRetry = retryCount < 2; // Retry up to 2 times
          }
          // Handle network errors
          else if (err instanceof TypeError && err.message === 'Failed to fetch') {
            errorMsg = 'Network error. Please check your connection.';
            shouldRetry = retryCount < 2;
          }
          else {
            errorMsg = err.message;
          }
        }
        
        // Implement exponential backoff retry
        if (shouldRetry) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          setError(`${errorMsg} Retrying in ${delay / 1000}s...`);
          
          setTimeout(() => {
            setError(null);
            sendMessage(userMessage, retryCount + 1);
          }, delay);
        } else {
          setError(`${errorMsg}${retryCount > 0 ? ' (after ' + retryCount + ' retries)' : ''}`);
          setIsStreaming(false);
          setStreamingText('');
        }
      }
    },
    [isStreaming, options]
  );

  const resetChat = useCallback(() => {
    setMessages([]);
    setStreamingText('');
    setIsStreaming(false);
    setError(null);
  }, []);

  const setInitialMessage = useCallback((message: string) => {
    setMessages([
      {
        role: 'assistant',
        content: message,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  const loadMessages = useCallback((loadedMessages: Message[]) => {
    setMessages(loadedMessages);
  }, []);

  const saveConversation = useCallback(async () => {
    if (!options.workItemId || !options.conversationType || messages.length === 0) {
      return;
    }

    try {
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_item_id: options.workItemId,
          conversation_type: options.conversationType,
          messages: messages,
          status: 'active',
        }),
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }, [messages, options.workItemId, options.conversationType]);

  return {
    messages,
    isStreaming,
    streamingText,
    error,
    sendMessage,
    resetChat,
    setInitialMessage,
    loadMessages,
    saveConversation,
  };
}
