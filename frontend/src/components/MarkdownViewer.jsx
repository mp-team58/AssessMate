import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const MarkdownViewer = ({ content, className = '' }) => {
  return (
    <div className={`prose prose-sm max-w-none text-secondary-800 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Override some default styles if necessary, but typography plugin usually handles this well
          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
          pre: ({ node, ...props }) => <pre className="bg-secondary-800 text-secondary-50 p-3 rounded-lg overflow-x-auto my-3" {...props} />,
          code: ({ node, inline, ...props }) => 
            inline ? (
              <code className="bg-secondary-100 text-secondary-800 px-1 py-0.5 rounded text-[0.9em]" {...props} />
            ) : (
              <code {...props} />
            ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;
