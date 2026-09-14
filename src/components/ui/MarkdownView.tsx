import ReactMarkdown from 'react-markdown'
import { remarkPlugins, rehypePlugins } from '../../lib/markdown'

export default function MarkdownView({ content }: { content: string }) {
  return (
    <div className="md-content">
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
