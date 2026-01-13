import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import { spawnSync } from "child_process";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";

export type LineColor = "green" | "magenta" | "red" | "white" | "cyan" | "yellow" | "gray" | "orange" | "purple";

// Map LineColor to actual color values (some need hex since they're not standard terminal colors)
const colorMap = (color: LineColor): string => {
  if (color === "orange") return "#ff8c00";
  if (color === "purple") return "#8b5cf6";
  return color;
};

export interface StyledLine {
  text: string;
  color?: LineColor;
}

export interface PanelSection {
  title?: string;
  titleColor?: LineColor;
  lines: StyledLine[];
  separator?: boolean;  // Show ─── line after section
}

// Structured data for session status panels
export interface DoneItem {
  text: string;
  done?: boolean;  // true = ✓, false = → (in progress)
}

export interface IssueItem {
  text: string;
  fixed: boolean;  // true = ✓, false = ✗
  solution?: string;
}

export interface TodoItem {
  text: string;
  status: "done" | "in_progress" | "pending";
}

export type GitFileStatus = "M" | "A" | "D" | "?";  // Modified, Added, Deleted, Untracked

export interface GitChange {
  file: string;
  status: GitFileStatus;
  additions?: number;
  deletions?: number;
}

export interface SessionSummaryConfig {
  type: "session-summary";
  summary: string;  // Executive summary paragraph
  goal: string;
  workingDir?: string;  // Current working directory
  done: DoneItem[];
  issues?: IssueItem[];
  changes?: GitChange[];  // Git diff preview
  branch?: string;  // Current git branch
  maxDone?: number;  // Max items to show (default 10)
  maxChanges?: number;  // Max files to show (default 5)
}

export type AgentStatus = "working" | "waiting" | "error" | "complete";

export interface SessionTodoConfig {
  type: "session-todo";
  status?: AgentStatus;  // Agent status indicator
  statusMessage?: string;  // Optional message (e.g. "Reading files...", "Waiting for approval")
  startTime?: number;  // Epoch ms - elapsed time calculated automatically
  todos: TodoItem[];
  maxTodos?: number;  // Max items to show (default 8)
  // Legacy manual override (ignored if startTime provided)
  completed?: number;
  total?: number;
  elapsed?: string;
}

export interface PanelConfig {
  title?: string;
  content?: string;
  lines?: StyledLine[];  // Array of styled lines (takes precedence over content)
  sections?: PanelSection[];  // Section-based layout with auto-spacing (takes precedence over lines)
  sessionSummary?: SessionSummaryConfig;  // Structured summary panel (takes precedence over sections)
  sessionTodo?: SessionTodoConfig;  // Structured todo panel (takes precedence over sections)
  borderColor?: string;
  titleColor?: string;
  noBorder?: boolean;    // If true, render without border
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

  // Timer for elapsed time and spinner updates
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const sessionTodo = liveConfig?.sessionTodo;
    const needsTimer = sessionTodo?.startTime || sessionTodo?.status === "working";
    if (!needsTimer) return;

    // Update every 200ms for smooth spinner, or every second for time only
    const interval = sessionTodo?.status === "working" ? 200 : 1000;
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, interval);

    return () => clearInterval(timer);
  }, [liveConfig?.sessionTodo?.startTime, liveConfig?.sessionTodo?.status]);

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

  const title = liveConfig?.title;
  const content = liveConfig?.content || "";
  const lines = liveConfig?.lines;
  const sections = liveConfig?.sections;
  const sessionSummary = liveConfig?.sessionSummary;
  const sessionTodo = liveConfig?.sessionTodo;
  const borderColor = liveConfig?.borderColor || "cyan";
  const titleColor = liveConfig?.titleColor || "cyan";
  const noBorder = liveConfig?.noBorder || false;

  // Adjust dimensions based on border presence
  const innerWidth = noBorder ? Math.max(1, termWidth - 2) : Math.max(1, termWidth - 4);
  const contentHeight = noBorder ? Math.max(1, termHeight - 2) : Math.max(1, termHeight - 4);

  // Helper to create progress bar
  const makeProgressBar = (completed: number, total: number, width: number = 20): string => {
    const filled = Math.round((completed / total) * width);
    const empty = width - filled;
    return "[" + "█".repeat(filled) + "░".repeat(empty) + "]";
  };

  // Helper to pad/truncate text to fixed width
  const padText = (text: string, width: number): string => {
    if (text.length > width) return text.slice(0, width);
    return text + " ".repeat(width - text.length);
  };

  // Build content based on config type: sessionSummary > sessionTodo > sections > lines > content
  const renderContent = () => {
    // Session Summary Panel
    if (sessionSummary) {
      const maxDone = sessionSummary.maxDone || 10;
      const colWidth = Math.floor((innerWidth - 3) / 2); // -3 for " │ "

      const renderedLines: React.ReactNode[] = [];
      let lineKey = 0;

      // Summary section
      renderedLines.push(<Text key={lineKey++} color={colorMap("purple")} bold>Summary</Text>);
      // Word wrap summary to innerWidth
      const summaryWords = sessionSummary.summary.split(" ");
      let currentLine = "";
      for (const word of summaryWords) {
        if ((currentLine + " " + word).trim().length > innerWidth) {
          renderedLines.push(<Text key={lineKey++} color="white">{currentLine.trim()}</Text>);
          currentLine = word;
        } else {
          currentLine = (currentLine + " " + word).trim();
        }
      }
      if (currentLine) {
        renderedLines.push(<Text key={lineKey++} color="white">{currentLine}</Text>);
      }
      renderedLines.push(<Text key={lineKey++}> </Text>);

      // Goal section
      renderedLines.push(<Text key={lineKey++} color={colorMap("purple")} bold>Goal</Text>);
      renderedLines.push(<Text key={lineKey++} color="white">{sessionSummary.goal.slice(0, innerWidth)}</Text>);
      renderedLines.push(<Text key={lineKey++}> </Text>);

      // Working directory
      if (sessionSummary.workingDir) {
        renderedLines.push(
          <Text key={lineKey++}>
            <Text color="gray">cwd: </Text>
            <Text color="cyan">{sessionSummary.workingDir.slice(0, innerWidth - 5)}</Text>
          </Text>
        );
        renderedLines.push(<Text key={lineKey++}> </Text>);
      }

      // Done + Issues table
      const hasIssues = sessionSummary.issues && sessionSummary.issues.length > 0;
      if (hasIssues) {
        renderedLines.push(
          <Text key={lineKey++} color="gray">
            {padText("Done", colWidth)} │ Issues
          </Text>
        );
        renderedLines.push(
          <Text key={lineKey++} color="gray">
            {"─".repeat(colWidth)} ┼ {"─".repeat(colWidth)}
          </Text>
        );
      } else {
        renderedLines.push(<Text key={lineKey++} color="gray">Done</Text>);
        renderedLines.push(<Text key={lineKey++} color="gray">{"─".repeat(Math.min(colWidth, 40))}</Text>);
      }

      // Render done items + issues side by side
      const doneItems = sessionSummary.done.slice(0, maxDone);
      const issueItems = sessionSummary.issues || [];
      const maxRows = Math.max(doneItems.length, issueItems.length);

      for (let i = 0; i < maxRows; i++) {
        const doneItem = doneItems[i];
        const issueItem = issueItems[i];

        let doneText = "";
        if (doneItem) {
          const symbol = doneItem.done === false ? "→" : "✓";
          doneText = `${symbol} ${doneItem.text}`;
        }

        let issueText = "";
        if (issueItem) {
          const symbol = issueItem.fixed ? "✓" : "✗";
          issueText = `${symbol} ${issueItem.text}`;
          if (issueItem.solution) {
            issueText += ` → ${issueItem.solution}`;
          }
        }

        if (hasIssues) {
          renderedLines.push(
            <Text key={lineKey++} color="white">
              {padText(doneText, colWidth)} │ {issueText.slice(0, colWidth)}
            </Text>
          );
        } else {
          renderedLines.push(<Text key={lineKey++} color="white">{doneText.slice(0, innerWidth)}</Text>);
        }
      }

      // Show overflow indicator
      if (sessionSummary.done.length > maxDone) {
        const overflow = `  ... +${sessionSummary.done.length - maxDone} more`;
        renderedLines.push(<Text key={lineKey++} color="gray">{overflow}</Text>);
      }

      // Git changes section (75% width for better readability)
      if (sessionSummary.changes && sessionSummary.changes.length > 0) {
        const maxChanges = sessionSummary.maxChanges || 15;
        const changesWidth = Math.floor(innerWidth * 0.75);
        const maxFileLen = changesWidth - 18; // Leave room for status + numbers + spacing
        const totalAdditions = sessionSummary.changes.reduce((sum, c) => sum + (c.additions || 0), 0);
        const totalDeletions = sessionSummary.changes.reduce((sum, c) => sum + (c.deletions || 0), 0);

        renderedLines.push(<Text key={lineKey++}> </Text>);

        // Branch and changes header
        const branchDisplay = sessionSummary.branch ? ` (${sessionSummary.branch})` : "";
        renderedLines.push(
          <Text key={lineKey++}>
            <Text color={colorMap("purple")} bold>Changes</Text>
            <Text color="cyan">{branchDisplay}</Text>
            <Text color="gray"> {sessionSummary.changes.length} files</Text>
          </Text>
        );
        renderedLines.push(<Text key={lineKey++} color="gray">{"─".repeat(changesWidth)}</Text>);

        const visibleChanges = sessionSummary.changes.slice(0, maxChanges);

        // Calculate max widths for alignment
        const maxAddWidth = Math.max(...visibleChanges.map(c => c.additions !== undefined ? `+${c.additions}`.length : 0));
        const maxDelWidth = Math.max(...visibleChanges.map(c => c.deletions !== undefined ? `-${c.deletions}`.length : 0));

        for (const change of visibleChanges) {
          // Status color: M=white, A=green, D=red, ?=yellow
          let statusColor: LineColor;
          switch (change.status) {
            case "A": statusColor = "green"; break;
            case "D": statusColor = "red"; break;
            case "?": statusColor = "yellow"; break;
            default: statusColor = "white";
          }

          // Truncate filename to fit (show end of path with ... prefix)
          let fileName = change.file;
          if (maxFileLen > 5 && fileName.length > maxFileLen) {
            fileName = "..." + fileName.slice(-(maxFileLen - 3));
          } else if (maxFileLen <= 5) {
            // Width too narrow, just truncate
            fileName = fileName.slice(0, Math.max(maxFileLen, 3));
          }

          // Format numbers - right aligned
          const additions = change.additions !== undefined ? `+${change.additions}`.padStart(maxAddWidth) : " ".repeat(maxAddWidth);
          const deletions = change.deletions !== undefined ? `-${change.deletions}`.padStart(maxDelWidth) : " ".repeat(maxDelWidth);
          const hasNumbers = change.additions !== undefined || change.deletions !== undefined;

          // Calculate spacing to right-align numbers
          const numWidth = maxAddWidth + 1 + maxDelWidth; // "+123 -45"
          const lineContentWidth = 2 + fileName.length; // "M " + filename
          const spacing = Math.max(1, changesWidth - lineContentWidth - numWidth);

          renderedLines.push(
            <Text key={lineKey++}>
              <Text color={colorMap(statusColor)}>{change.status}</Text>
              <Text color="white"> {fileName}</Text>
              <Text>{" ".repeat(spacing)}</Text>
              {hasNumbers && <Text color="green">{additions}</Text>}
              {hasNumbers && <Text> </Text>}
              {hasNumbers && <Text color="red">{deletions}</Text>}
            </Text>
          );
        }

        // Overflow
        if (sessionSummary.changes.length > maxChanges) {
          const overflow = `  ... +${sessionSummary.changes.length - maxChanges} more`;
          renderedLines.push(<Text key={lineKey++} color="gray">{overflow}</Text>);
        }

        // Total summary
        renderedLines.push(
          <Text key={lineKey++} color="gray">
            Total: <Text color="green">+{totalAdditions}</Text> <Text color="red">-{totalDeletions}</Text>
          </Text>
        );
      }

      return renderedLines.slice(0, contentHeight);
    }

    // Session Todo Panel
    if (sessionTodo) {
      const maxTodos = sessionTodo.maxTodos || 8;
      const renderedLines: React.ReactNode[] = [];
      let lineKey = 0;

      // Status indicator with spinner
      const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
      const status = sessionTodo.status || "working";
      const statusMessage = sessionTodo.statusMessage || "";

      let statusSymbol: string;
      let statusColor: LineColor;
      let statusText: string;
      let useBackground = false;

      switch (status) {
        case "working":
          statusSymbol = spinnerFrames[tick % spinnerFrames.length];
          statusColor = "white";
          statusText = statusMessage || "Working...";
          useBackground = false;
          break;
        case "waiting":
          statusSymbol = "○";
          statusColor = "orange";
          statusText = statusMessage || "Waiting for input";
          useBackground = true;
          break;
        case "error":
          statusSymbol = "✗";
          statusColor = "red";
          statusText = statusMessage || "Error occurred";
          useBackground = true;
          break;
        case "complete":
          statusSymbol = "✓";
          statusColor = "green";
          statusText = statusMessage || "Complete";
          useBackground = true;
          break;
      }

      // Status bar - full width, with or without background
      const statusLine = `${statusSymbol} ${statusText}`;
      const padding = " ".repeat(Math.max(0, innerWidth - statusLine.length));
      if (useBackground) {
        renderedLines.push(
          <Text key={lineKey++} backgroundColor={colorMap(statusColor)} color="white" bold>
            {statusLine}{padding}
          </Text>
        );
      } else {
        renderedLines.push(
          <Text key={lineKey++} color={colorMap(statusColor)} bold>
            {statusLine}
          </Text>
        );
      }
      renderedLines.push(<Text key={lineKey++}> </Text>);

      // Auto-calculate progress from todos
      const completedCount = sessionTodo.completed ?? sessionTodo.todos.filter(t => t.status === "done").length;
      const totalCount = sessionTodo.total ?? sessionTodo.todos.length;

      // Auto-calculate elapsed time from startTime
      let elapsed = sessionTodo.elapsed || "";
      if (sessionTodo.startTime) {
        const elapsedMs = Date.now() - sessionTodo.startTime;
        const seconds = Math.floor(elapsedMs / 1000) % 60;
        const minutes = Math.floor(elapsedMs / 60000) % 60;
        const hours = Math.floor(elapsedMs / 3600000);
        if (hours > 0) {
          elapsed = `+${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
          elapsed = `+${minutes}m ${seconds}s`;
        } else {
          elapsed = `+${seconds}s`;
        }
      }

      // Title
      renderedLines.push(<Text key={lineKey++} color={colorMap("purple")} bold>Next</Text>);

      // Progress bar
      const progressBar = makeProgressBar(completedCount, totalCount);
      const progressText = `${completedCount}/${totalCount}`;
      const spacer = " ".repeat(Math.max(1, innerWidth - progressBar.length - progressText.length - elapsed.length - 4));
      renderedLines.push(
        <Text key={lineKey++} color="white">
          {progressBar} {progressText}{spacer}{elapsed}
        </Text>
      );
      renderedLines.push(<Text key={lineKey++}> </Text>);

      // Todo items (filter out done items, show in_progress first)
      const pendingTodos = sessionTodo.todos.filter(t => t.status !== "done");
      const sortedTodos = [
        ...pendingTodos.filter(t => t.status === "in_progress"),
        ...pendingTodos.filter(t => t.status === "pending"),
      ];
      const visibleTodos = sortedTodos.slice(0, maxTodos);

      for (const todo of visibleTodos) {
        let symbol: string;
        let color: LineColor;
        switch (todo.status) {
          case "done":
            symbol = "✓";
            color = "green";
            break;
          case "in_progress":
            symbol = "→";
            color = "yellow";
            break;
          default:
            symbol = "•";
            color = "gray";
        }
        renderedLines.push(
          <Text key={lineKey++} color={color}>
            {symbol} {todo.text.slice(0, innerWidth - 2)}
          </Text>
        );
      }

      // Overflow
      if (sortedTodos.length > maxTodos) {
        const overflow = `  ... +${sortedTodos.length - maxTodos} more`;
        renderedLines.push(<Text key={lineKey++} color="gray">{overflow}</Text>);
      }

      return renderedLines.slice(0, contentHeight);
    }

    if (sections && sections.length > 0) {
      // Section-based layout with auto-spacing
      const totalSectionLines = sections.reduce((acc, section) => {
        let count = section.lines.length;
        if (section.title) count += 1;
        if (section.separator) count += 1;
        return acc + count;
      }, 0);

      // Calculate spacing between sections
      const availableForSpacing = Math.max(0, contentHeight - totalSectionLines);
      const gaps = sections.length + 1; // gaps before first, between each, and after last
      const baseGap = Math.floor(availableForSpacing / gaps);
      const extraGaps = availableForSpacing % gaps;

      const renderedLines: React.ReactNode[] = [];

      // Add initial spacing
      for (let i = 0; i < baseGap + (extraGaps > 0 ? 1 : 0); i++) {
        renderedLines.push(<Text key={`gap-start-${i}`}> </Text>);
      }

      sections.forEach((section, sectionIndex) => {
        // Section title
        if (section.title) {
          renderedLines.push(
            <Text key={`section-${sectionIndex}-title`} color={section.titleColor || "cyan"} bold>
              {section.title.slice(0, innerWidth)}
            </Text>
          );
        }

        // Section lines
        section.lines.forEach((line, lineIndex) => {
          renderedLines.push(
            <Text key={`section-${sectionIndex}-line-${lineIndex}`} color={line.color || "white"}>
              {line.text.slice(0, innerWidth)}
            </Text>
          );
        });

        // Separator
        if (section.separator) {
          const separatorLine = "─".repeat(Math.min(innerWidth, 80));
          renderedLines.push(
            <Text key={`section-${sectionIndex}-sep`} color="gray">
              {separatorLine}
            </Text>
          );
        }

        // Add spacing after section (except last)
        const gapSize = baseGap + (sectionIndex + 1 < extraGaps ? 1 : 0);
        for (let i = 0; i < gapSize; i++) {
          renderedLines.push(<Text key={`gap-${sectionIndex}-${i}`}> </Text>);
        }
      });

      return renderedLines.slice(0, contentHeight);
    }

    // Legacy: lines array or content string
    const styledLines: StyledLine[] = lines
      ? lines
      : content.split("\n").map(text => ({ text, color: "white" as const }));

    return styledLines.slice(0, contentHeight).map((line, i) => (
      <Text key={i} color={line.color || "white"}>
        {line.text.slice(0, innerWidth)}
      </Text>
    ));
  };

  return (
    <Box
      flexDirection="column"
      width={termWidth}
      height={termHeight}
      borderStyle={noBorder ? undefined : "round"}
      borderColor={noBorder ? undefined : borderColor}
    >
      {/* Title (only if explicitly set) */}
      {title && (
        <Box justifyContent="flex-start" width="100%">
          <Text color={titleColor} bold>
            {title}
          </Text>
        </Box>
      )}

      {/* Content */}
      <Box flexDirection="column" flexGrow={1} paddingX={noBorder ? 0 : 1}>
        {renderContent()}
      </Box>

      {/* Help hint - only show with border */}
      {!noBorder && (
        <Box justifyContent="center">
          <Text color="gray" dimColor>
            q quit
          </Text>
        </Box>
      )}
    </Box>
  );
}
