import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

// Плагины для пропсов react-markdown (remarkPlugins / rehypePlugins)
export const remarkPlugins = [remarkGfm]
export const rehypePlugins = [rehypeHighlight]
