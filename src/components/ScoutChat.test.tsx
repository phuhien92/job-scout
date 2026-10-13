import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScoutChat } from "./ScoutChat";

const { useChatMock } = vi.hoisted(() => ({
  useChatMock: vi.fn(),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: useChatMock,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const messages: Record<string, string> = {
      scoutAssistantLabel: "Scout",
      scoutComposerPlaceholder: "Search for a role, location, or remote work",
      scoutComposerSendLabel: "Send",
      scoutComposerStopLabel: "Stop",
      scoutDescription:
        "Try a suggested search, describe a role below, or upload your resume for more context.",
      scoutErrorTitle: "Search unavailable",
      scoutGreetingGuest: "What role are you scouting for today?",
      scoutHeading: "Scout for roles",
      scoutJobOpen: "Open listing",
      scoutJobRemote: "Remote",
      scoutNoJobs: "Try a broader role or location.",
      scoutNoJobsTitle: "No live matches found",
      scoutResultsLabel: "Live job matches",
      scoutSuggestionDesign: "Product designer roles near me",
      scoutSuggestionFullstack: "Fullstack engineer in Vietnam",
      scoutSuggestionRemote: "Frontend roles, remote",
      scoutSuggestionsLabel: "Suggested searches",
      scoutThreadLabel: "Scout conversation",
      scoutTyping: "Searching live jobs",
      scoutUploadResume: "Upload resume",
      scoutUserLabel: "You",
      chatErrorGeneric: "The request could not be completed. Try again shortly.",
    };
    return (key: string) => messages[key] ?? key;
  },
}));

type ChatState = {
  messages?: UIMessage[];
  status?: "ready" | "submitted" | "streaming" | "error";
  sendMessage?: ReturnType<typeof vi.fn>;
  stop?: ReturnType<typeof vi.fn>;
  error?: Error;
};

function setChatState(overrides: ChatState = {}) {
  const state = {
    messages: [],
    status: "ready" as const,
    sendMessage: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    error: undefined,
    clearError: vi.fn(),
    ...overrides,
  };
  useChatMock.mockReturnValue(state);
  return state;
}

function assistantMessage(parts: UIMessage["parts"]): UIMessage {
  return { id: "assistant-1", role: "assistant", parts };
}

afterEach(cleanup);

beforeEach(() => {
  useChatMock.mockReset();
});

describe("ScoutChat", () => {
  it("offers clear empty-state actions and sends a suggestion as a message", async () => {
    const chat = setChatState();
    const user = userEvent.setup();

    render(<ScoutChat />);

    expect(
      screen.getByRole("heading", { name: "What role are you scouting for today?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upload resume" })).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(screen.getByTestId("composer")).toHaveAttribute("data-ai-glow", "true");

    await user.click(screen.getByText("Frontend roles, remote"));

    expect(chat.sendMessage).toHaveBeenCalledWith({
      text: "Frontend roles, remote",
    });
  });

  it("clears the ai composer only after a successful send", async () => {
    const chat = setChatState();
    const user = userEvent.setup();

    render(<ScoutChat />);

    const composer = screen.getByPlaceholderText(
      "Search for a role, location, or remote work",
    );
    await user.type(composer, "Backend engineer{Enter}");

    expect(chat.sendMessage).toHaveBeenCalledWith({ text: "Backend engineer" });
    await waitFor(() => expect(composer).toHaveValue(""));
  });

  it("keeps a failed draft and lets the streaming control stop generation", async () => {
    const sendMessage = vi.fn().mockRejectedValue(new Error("offline"));
    setChatState({ sendMessage });
    const user = userEvent.setup();
    const { unmount } = render(<ScoutChat />);

    const composer = screen.getByPlaceholderText(
      "Search for a role, location, or remote work",
    );
    await user.type(composer, "Data analyst{Enter}");
    await waitFor(() => expect(sendMessage).toHaveBeenCalled());
    expect(composer).toHaveValue("Data analyst");

    unmount();
    const streaming = setChatState({ status: "streaming" });
    render(<ScoutChat />);
    await user.click(screen.getByRole("button", { name: "Stop" }));
    expect(streaming.stop).toHaveBeenCalledOnce();
  });

  it("renders a pending tool call without exposing its input", () => {
    setChatState({
      status: "streaming",
      messages: [
        assistantMessage([
          {
            type: "tool-search-jobs",
            toolCallId: "search-1",
            state: "input-available",
            input: { query: "secret pending query", remote: true },
          },
        ] as UIMessage["parts"]),
      ],
    });

    render(<ScoutChat />);

    expect(screen.getByText("Searching live jobs")).toBeInTheDocument();
    expect(screen.queryByText("secret pending query")).not.toBeInTheDocument();
  });

  it("renders completed tool output as source-linked job cards, never JSON", () => {
    setChatState({
      messages: [
        assistantMessage([
          { type: "text", text: "I found one strong match." },
          {
            type: "tool-search-jobs",
            toolCallId: "search-2",
            state: "output-available",
            input: { query: "frontend" },
            output: {
              jobs: [
                {
                  title: "Senior Frontend Engineer",
                  company: "Acme Labs",
                  location: "Ho Chi Minh City",
                  remote: true,
                  salary: "$80k–$100k",
                  summary: "Build accessible product experiences.",
                  url: "https://jobs.example.com/frontend",
                },
              ],
            },
          },
        ] as UIMessage["parts"]),
      ],
    });

    render(<ScoutChat />);

    expect(screen.getByText("I found one strong match.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Senior Frontend Engineer" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Acme Labs.*Remote.*\$80k/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open listing" })).toHaveAttribute(
      "href",
      "https://jobs.example.com/frontend",
    );
    expect(screen.queryByText(/"jobs"/)).not.toBeInTheDocument();
  });

  it("maps empty and failed tool completions to explicit feedback", () => {
    setChatState({
      messages: [
        assistantMessage([
          {
            type: "tool-search-jobs",
            toolCallId: "search-empty",
            state: "output-available",
            input: { query: "rare role" },
            output: { jobs: [] },
          },
          {
            type: "tool-search-jobs",
            toolCallId: "search-error",
            state: "output-error",
            input: { query: "frontend" },
            errorText: "Findwork is temporarily unavailable.",
          },
        ] as UIMessage["parts"]),
      ],
    });

    render(<ScoutChat />);

    expect(
      screen.getByRole("heading", { name: "No live matches found" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Try a broader role or location.")).toBeInTheDocument();
    expect(screen.getByText("Findwork is temporarily unavailable.")).toBeInTheDocument();
  });
});
