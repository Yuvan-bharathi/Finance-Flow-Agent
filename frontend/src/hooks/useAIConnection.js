import { useState, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';

/**
 * Custom Hook: useAIConnection
 * 
 * Purpose:
 *   Manages live AI connection state indicators and multi-step tool execution feedback
 *   inside the AI Copilot and Mobile AI Command Center.
 * 
 * Returns:
 *   {
 *     isOnline: boolean - True if online connection is active
 *     aiStatus: 'live' | 'offline' | 'analyzing' | 'tool_executing'
 *     statusText: string - Human-readable status (e.g. "Live 🟢", "Analyzing financial records...", etc.)
 *     activeTool: string | null - Currently running tool name
 *     setExecutingTool: (toolName: string | null) => void - Setter for active tool step
 *     setIsAnalyzing: (analyzing: boolean) => void - Setter for LLM generation phase
 *   }
 */
export const useAIConnection = () => {
  const { isOnline } = useOnlineStatus();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTool, setActiveTool] = useState(null);

  const setExecutingTool = useCallback((toolName) => {
    setActiveTool(toolName);
  }, []);

  let aiStatus = 'live';
  let statusText = 'Live';

  if (!isOnline) {
    aiStatus = 'offline';
    statusText = 'Offline';
  } else if (activeTool) {
    aiStatus = 'tool_executing';
    statusText = `Executing ${activeTool}...`;
  } else if (isAnalyzing) {
    aiStatus = 'analyzing';
    statusText = 'Analyzing financial records...';
  }

  return {
    isOnline,
    aiStatus,
    statusText,
    activeTool,
    setExecutingTool,
    setIsAnalyzing
  };
};

export default useAIConnection;
