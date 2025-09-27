import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type ChatMessageProps = {
  sender: "user" | "ai"
  text: string
}

export default function ChatMessage({ sender, text }: ChatMessageProps) {
  const isUser = sender === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xl px-4 py-2.5 rounded-2xl ${
          isUser
            ? "bg-accent-primary text-primary-foreground rounded-br-none"
            : "bg-secondary text-secondary-foreground rounded-bl-none"
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        ) : (
          <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-li:my-0 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:p-3 prose-pre:rounded-md prose-pre:overflow-x-auto">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
              // Style code blocks to match Roo Code's appearance
              pre: ({ children }) => (
                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto text-sm">
                  {children}
                </pre>
              ),
              // Style inline code
              code: ({ children, className }) => {
                const isCodeBlock = className?.includes('language-')
                if (isCodeBlock) {
                  return <code className={className}>{children}</code>
                }
                return (
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">
                    {children}
                  </code>
                )
              },
              // Style lists to match Roo Code
              ul: ({ children }) => (
                <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-4 space-y-1 my-2">{children}</ol>
              ),
              // Style paragraphs
              p: ({ children }) => (
                <p className="my-2 last:mb-0">{children}</p>
              ),
              // Style headings
              h1: ({ children }) => (
                <h1 className="text-lg font-semibold my-2">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-semibold my-2">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold my-2">{children}</h3>
              ),
            }}
          >
            {text}
          </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
