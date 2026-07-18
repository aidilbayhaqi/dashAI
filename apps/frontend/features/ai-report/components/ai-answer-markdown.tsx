import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AIAnswerMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mb-3 mt-5 text-xl font-black text-slate-950 first:mt-0 dark:text-white">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-2 mt-5 text-base font-black text-slate-950 first:mt-0 dark:text-white">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-2 mt-4 text-sm font-black text-slate-900 first:mt-0 dark:text-slate-100">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="my-2 text-sm font-medium leading-7 text-slate-700 dark:text-slate-200">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-black text-slate-950 dark:text-white">{children}</strong>
        ),
        ul: ({ children }) => <ul className="my-3 space-y-2 pl-1">{children}</ul>,
        ol: ({ children }) => <ol className="my-3 list-decimal space-y-2 pl-6">{children}</ol>,
        li: ({ children }) => (
          <li className="flex gap-2 text-sm font-medium leading-6 text-slate-700 dark:text-slate-200">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <div className="min-w-0">{children}</div>
          </li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-4 rounded-r-2xl border-l-4 border-blue-500 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">{children}</blockquote>
        ),
        code: ({ children }) => (
          <code className="rounded-md bg-slate-200 px-1.5 py-0.5 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-200">{children}</code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
