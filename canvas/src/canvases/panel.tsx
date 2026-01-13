import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import { spawnSync } from "child_process";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";

export interface PanelConfig {
  title?: string;
  content?: string;
  borderColor?: string;
  titleColor?: string;
  watchPaneId?: string;  // If set, panel auto-exits when this pane closes
}

interface Props {
  id: string;
  config?: PanelConfig;
  socketPath?: string;
  scenario?: string;
}

export function Panel({ id, config: initialConfig, socketPath, scenario = "display" }: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Live config state (can be updated via IPC)
  const [liveConfig, setLiveConfig] = useState<PanelConfig | undefined>(initialConfig);

  // IPC for communicating with Claude
  const ipc = useIPCServer({
    socketPath,
    scenario: scenario || "display",
    onClose: () => exit(),
    onUpdate: (newConfig) => {
      setLiveConfig(newConfig as PanelConfig);
    },
  });

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 10,
  });

  // Listen for terminal resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: stdout?.columns || 120,
        height: stdout?.rows || 10,
      });
    };

    stdout?.on("resize", updateDimensions);
    updateDimensions();

    return () => {
      stdout?.off("resize", updateDimensions);
    };
  }, [stdout]);

  // Watch for parent pane exit - auto-close when main pane closes
  useEffect(() => {
    const watchPaneId = liveConfig?.watchPaneId;
    if (!watchPaneId) return;

    const checkPaneExists = () => {
      // Check if the watched pane still exists
      const result = spawnSync("tmux", ["display-message", "-t", watchPaneId, "-p", "#{pane_id}"]);
      const output = result.stdout?.toString().trim();

      // Pane is gone if command fails or returns different/empty pane ID
      if (result.status !== 0 || output !== watchPaneId) {
        exit();
      }
    };

    // Check every 2000ms (reduced frequency since SessionEnd hook handles fast exit)
    const interval = setInterval(checkPaneExists, 2000);

    return () => clearInterval(interval);
  }, [liveConfig?.watchPaneId, exit]);

  // Handle keyboard input
  useInput((input, key) => {
    if (input === "q" || key.escape) {
      exit();
    }
  });

  const termWidth = dimensions.width;
  const termHeight = dimensions.height;

  const title = liveConfig?.title || "Panel";
  const content = liveConfig?.content || "";
  const borderColor = liveConfig?.borderColor || "cyan";
  const titleColor = liveConfig?.titleColor || "cyan";

  // Split content into lines
  const contentLines = content.split("\n");
  const innerWidth = Math.max(1, termWidth - 4);
  const contentHeight = Math.max(1, termHeight - 4); // Account for border and title

  return (
    <Box
      flexDirection="column"
      width={termWidth}
      height={termHeight}
      borderStyle="round"
      borderColor={borderColor}
    >
      {/* Title */}
      <Box justifyContent="center" width="100%">
        <Text color={titleColor} bold>
          {title}
        </Text>
      </Box>

      {/* Content */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {contentLines.slice(0, contentHeight).map((line, i) => (
          <Text key={i} color="white">
            {line.slice(0, innerWidth)}
          </Text>
        ))}
      </Box>

      {/* Help hint */}
      <Box justifyContent="center">
        <Text color="gray" dimColor>
          q quit
        </Text>
      </Box>
    </Box>
  );
}
