"use client";

import { motion } from "framer-motion";
import {
  Check,
  CircleStop,
  Pencil,
  Folder,
  SkipForward,
  SearchCheck,
} from "lucide-react";
import { useState, useEffect } from "react";

import Action from "@/components/iiagent/pegasus-action";
import Markdown from "@/components/iiagent/pegasus-markdown";
import { ActionStep, Message } from "@/lib/agent-types";
import { getFileIconAndColor } from "@/components/iiagent/file-utils";
import { Button } from "@/components/ui/button";
import EditQuestion from "@/components/iiagent/pegasus-edit-question";
import { usePegasusContext } from "@/components/iiagent/pegasus-context";

interface ChatMessageProps {
  isReplayMode: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  handleClickAction: (
    data: ActionStep | undefined,
    showTabOnly?: boolean
  ) => void;
}

const PegasusChatMessage = ({
  messagesEndRef,
  isReplayMode,
  handleClickAction,
}: ChatMessageProps) => {
  const { state, dispatch } = usePegasusContext();
  const [showQuestionInput, setShowQuestionInput] = useState(false);
  const [pendingFilesCount, setPendingFilesCount] = useState(0);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);

  console.log("[Pegasus ChatMessage] render", { 
    messageCount: state.messages.length, 
    isLoading: state.isLoading,
    lastMessage: state.messages[state.messages.length - 1]
  });

  const handleFilesChange = (count: number) => {
    setPendingFilesCount(count);
  };

  useEffect(() => {
    if (isReplayMode && !state.isLoading && state.messages.length > 0) {
      setShowQuestionInput(true);
    }
  }, [isReplayMode, state.isLoading, state.messages.length]);

  useEffect(() => {
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (!messagesContainer) return;

    const handleScroll = () => {
      const isAtBottom =
        messagesContainer.scrollHeight -
          messagesContainer.scrollTop -
          messagesContainer.clientHeight <
        50;
      setUserHasScrolledUp(!isAtBottom);
    };

    messagesContainer.addEventListener("scroll", handleScroll);
    return () => messagesContainer.removeEventListener("scroll", handleScroll);
  }, [messagesEndRef]);

  useEffect(() => {
    if (state.messages.length > 0 && !userHasScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [state.messages?.length, userHasScrolledUp]);

  const handleJumpToResult = () => {
    // Skip to results - just scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowQuestionInput(true);
    }, 100);
  };

  const isLatestUserMessage = (
    message: Message,
    allMessages: Message[]
  ): boolean => {
    const userMessages = allMessages.filter((msg) => msg.type === "user");
    return (
      userMessages.length > 0 &&
      userMessages[userMessages.length - 1].id === message.id
    );
  };

  const handleSetEditingMessage = (message?: Message) => {
    dispatch({ type: "SET_EDITING_MESSAGE", payload: message });
  };

  // Removed connectWebSocket effect - handled by container

  return (
    <div className="flex flex-col h-full">
      <motion.div
        className={`flex-1 p-4 pt-0 w-full overflow-y-auto relative ${
          isReplayMode && !showQuestionInput
            ? "max-h-[calc(100vh-182px)]"
            : pendingFilesCount > 0
            ? "max-h-[calc(100vh-330px)]"
            : "max-h-[calc(100vh-252px)]"
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        {state.messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 ${
              message.type === "user" ? "text-right" : "text-left"
            } ${message.type === "user" && !message.files && "mb-8"} ${
              message.isHidden ? "hidden" : ""
            }`}
          >
            {message.files && message.files.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                {(() => {
                  const folderFiles = message.files.filter((fileName) =>
                    fileName.match(/^folder:(.+):(\d+)$/)
                  );

                  const folderNames = folderFiles
                    .map((folderFile) => {
                      const match = folderFile.match(/^folder:(.+):(\d+)$/);
                      return match ? match[1] : null;
                    })
                    .filter(Boolean) as string[];

                  const filesToDisplay = message.files.filter((fileName) => {
                    if (fileName.match(/^folder:(.+):(\d+)$/)) {
                      return true;
                    }

                    for (const folderName of folderNames) {
                      if (fileName.includes(folderName)) {
                        return false;
                      }
                    }

                    return true;
                  });

                  return filesToDisplay.map((fileName, fileIndex) => {
                    const isFolderMatch = fileName.match(/^folder:(.+):(\d+)$/);
                    if (isFolderMatch) {
                      const folderName = isFolderMatch[1];
                      const fileCount = parseInt(isFolderMatch[2], 10);

                      return (
                        <div
                          key={`${message.id}-folder-${fileIndex}`}
                          className="inline-block ml-auto bg-[#35363a] text-white rounded-2xl px-4 py-3 border border-gray-700 shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl">
                              <Folder className="size-6 text-white" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-base font-medium">
                                {folderName}
                              </span>
                              <span className="text-left text-sm text-gray-500">
                                {fileCount} {fileCount === 1 ? "file" : "files"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const isImage =
                      fileName.match(
                        /\.(jpeg|jpg|gif|png|webp|svg|heic|bmp)$/i
                      ) !== null;

                    if (
                      isImage &&
                      message.fileContents &&
                      message.fileContents[fileName]
                    ) {
                      return (
                        <div
                          key={`${message.id}-file-${fileIndex}`}
                          className="inline-block ml-auto rounded-3xl overflow-hidden max-w-[320px]"
                        >
                          <div className="w-40 h-40 rounded-xl overflow-hidden">
                            <img
                              src={message.fileContents[fileName]}
                              alt={fileName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      );
                    }

                    const { IconComponent, bgColor, label } =
                      getFileIconAndColor(fileName);

                    return (
                      <div
                        key={`${message.id}-file-${fileIndex}`}
                        className="inline-block ml-auto bg-[#35363a] text-white rounded-2xl px-4 py-3 border border-gray-700 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex items-center justify-center w-12 h-12 ${bgColor} rounded-xl`}
                          >
                            <IconComponent className="size-6 text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-base font-medium">
                              {fileName}
                            </span>
                            <span className="text-left text-sm text-gray-500">
                              {label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {message.content && (
              <div
                className={`inline-block text-left rounded-lg ${
                  message.type === "user"
                    ? "bg-[#35363a] p-3 max-w-[80%] text-white border border-[#3A3B3F] shadow-sm whitespace-pre-wrap"
                    : "text-white"
                } ${
                  state.editingMessage?.id === message.id
                    ? "w-full max-w-none"
                    : ""
                } ${
                  message.content?.startsWith("```Thinking:")
                    ? "agent-thinking w-full"
                    : ""
                }`}
              >
                {message.type === "user" ? (
                  <div>
                    {state.editingMessage?.id === message.id ? (
                      // EditQuestion temporarily disabled - needs prop functions
                      <div className="text-left">{message.content}</div>
                    ) : (
                      <div className="relative group">
                        <div className="text-left">{message.content}</div>
                        {isLatestUserMessage(message, state.messages) &&
                          !isReplayMode && (
                            <div className="absolute -bottom-[45px] -right-[20px] opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-xs cursor-pointer hover:!bg-transparent"
                                onClick={() => {
                                  handleSetEditingMessage(message);
                                }}
                              >
                                <Pencil className="size-3 mr-1" />
                              </Button>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                ) : (
                  <Markdown>{message.content}</Markdown>
                )}
              </div>
            )}

            {message.action && (
              <div className="mt-2">
                <Action
                  action={message.action}
                  onClick={() => handleClickAction(message.action, true)}
                />
              </div>
            )}
          </div>
        ))}

        {state.isLoading && (
          <motion.div
            className="mb-4 text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
            <motion.div
              className="inline-block p-3 text-left rounded-lg bg-neutral-800/90 text-white backdrop-blur-sm"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-[dot-bounce_1.2s_ease-in-out_infinite_0ms]" />
                  <div className="w-2 h-2 bg-white rounded-full animate-[dot-bounce_1.2s_ease-in-out_infinite_200ms]" />
                  <div className="w-2 h-2 bg-white rounded-full animate-[dot-bounce_1.2s_ease-in-out_infinite_400ms]" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {state.isCompleted && (
          <div className="flex flex-col gap-y-4">
            <div className="flex gap-x-2 items-center bg-[#25BA3B1E] text-green-600 text-sm p-2 rounded-full">
              <div className="flex gap-x-2 items-center">
                <Check className="size-4" />
                <span>Pegasus has completed the current task.</span>
              </div>
            </div>
            {state.toolSettings?.enable_reviewer && (
              <div
                className={`group cursor-pointer flex items-start gap-2 px-3 py-2 bg-[#35363a] rounded-xl backdrop-blur-sm 
      shadow-sm
      transition-all duration-200 ease-out
      hover:shadow-[0_2px_8px_rgba(0,0,0,0.24)]
      active:scale-[0.98] overflow-hidden
      animate-fadeIn`}
              >
                <div className="flex text-sm items-center justify-between flex-1">
                  <div className="flex items-center gap-x-1.5 flex-1">
                    <SearchCheck className="size-5 text-white" />
                    <span className="text-neutral-100 flex-1 font-medium group-hover:text-white">
                      Allow Pegasus to review the results
                    </span>
                  </div>
                  {/* Review button temporarily disabled */}
                </div>
              </div>
            )}
          </div>
        )}

        {state.isStopped && (
          <div className="flex gap-x-2 items-center bg-[#ffbf361f] text-yellow-300 text-sm p-2 rounded-full">
            <CircleStop className="size-4" />
            <span>Pegasus has stopped, send a new message to continue.</span>
          </div>
        )}

  <div ref={messagesEndRef as unknown as any} />
      </motion.div>
    </div>
  );
};

export default PegasusChatMessage;
