import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered } from 'lucide-react';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Enter description...',
  className,
  minHeight = '80px',
}: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none',
          'min-h-[60px] px-3 py-2',
          '[&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4',
          '[&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Convert empty editor to empty string
      if (html === '<p></p>') {
        onChange('');
      } else {
        onChange(html);
      }
    },
  });

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('border border-input rounded-md bg-background overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-1 border-b border-input bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 w-7 p-0',
            editor.isActive('bold') && 'bg-accent text-accent-foreground'
          )}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 w-7 p-0',
            editor.isActive('italic') && 'bg-accent text-accent-foreground'
          )}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 w-7 p-0',
            editor.isActive('underline') && 'bg-accent text-accent-foreground'
          )}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 w-7 p-0',
            editor.isActive('bulletList') && 'bg-accent text-accent-foreground'
          )}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 w-7 p-0',
            editor.isActive('orderedList') && 'bg-accent text-accent-foreground'
          )}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Editor */}
      <div 
        className="relative"
        style={{ minHeight }}
      >
        <EditorContent 
          editor={editor} 
          className="text-sm"
        />
        {editor.isEmpty && (
          <p className="absolute top-2 left-3 text-muted-foreground/60 text-sm pointer-events-none">
            {placeholder}
          </p>
        )}
      </div>
    </div>
  );
};

export { RichTextEditor };
