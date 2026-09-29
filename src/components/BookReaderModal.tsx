import React, { useState, useEffect } from 'react';
import { BookItem } from '../types/index.ts';
import { X, ExternalLink, BookA, Bookmark, Sparkles, BookOpen, Layers } from 'lucide-react';

interface BookReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookItem | null;
  onOpenDictionaryWithWord?: (word: string) => void;
  onSaveToBookshelf?: (book: BookItem) => void;
}

export const BookReaderModal: React.FC<BookReaderModalProps> = ({
  isOpen,
  onClose,
  book,
  onOpenDictionaryWithWord,
  onSaveToBookshelf,
}) => {
  const [selectedText, setSelectedText] = useState('');
  const [readingProgress, setReadingProgress] = useState(20);
  const [isSaved, setIsSaved] = useState(false);
  const [activeViewer, setActiveViewer] = useState<'google' | 'archive'>('google');
  const [googleBookId, setGoogleBookId] = useState<string | null>(null);
  const [isResolvingGoogleBook, setIsResolvingGoogleBook] = useState(false);

  useEffect(() => {
    if (!book) return;
    setIsSaved(false);
    setSelectedText('');

    if (book.googleBookId) {
      setGoogleBookId(book.googleBookId);
      setActiveViewer('google');
    } else {
      // Resolve Google Book ID via backend or ISBN/Title
      setIsResolvingGoogleBook(true);
      const query = book.isbn && book.isbn.length > 0
        ? `isbn:${book.isbn[0]}`
        : `intitle:${book.title}`;

      fetch(`/api/library/google-books?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.books && data.books.length > 0 && data.books[0].googleBookId) {
            setGoogleBookId(data.books[0].googleBookId);
            setActiveViewer('google');
          } else {
            // Default to archive if google book id not found
            if (book.ia && book.ia.length > 0) {
              setActiveViewer('archive');
            }
          }
        })
        .catch(() => {
          if (book.ia && book.ia.length > 0) {
            setActiveViewer('archive');
          }
        })
        .finally(() => {
          setIsResolvingGoogleBook(false);
        });
    }
  }, [book]);

  if (!isOpen || !book) return null;

  const iaId = book.ia && book.ia.length > 0 ? book.ia[0] : null;
  const archiveEmbedUrl = iaId ? `https://archive.org/embed/${iaId}?ui=embed` : null;

  // Google Books Embedded Viewer URL (supports full interactive page turning, zoom, table of contents)
  const googleEmbedUrl = googleBookId
    ? `https://books.google.com/books?id=${googleBookId}&lpg=PP1&pg=PP1&output=embed`
    : null;

  const openLibraryUrl = `https://openlibrary.org${book.key}`;
  const googleBooksUrl = googleBookId
    ? `https://books.google.com/books?id=${googleBookId}`
    : `https://www.google.com/search?tbm=bks&q=${encodeURIComponent(book.title)}`;

  const handleTextSelection = () => {
    const text = window.getSelection()?.toString().trim();
    if (text && text.length > 1 && text.length < 40) {
      setSelectedText(text);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl h-[94vh] rounded-[18px] border-2 border-[#146C4E] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Reader Controls */}
        <div className="px-4 py-3 bg-[#0F513B] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 truncate">
            {book.cover_i ? (
              <img
                src={`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`}
                alt=""
                className="w-7 h-10 object-cover rounded-[3px] border border-white/20 shrink-0"
              />
            ) : (book as any).coverUrl ? (
              <img
                src={(book as any).coverUrl}
                alt=""
                className="w-7 h-10 object-cover rounded-[3px] border border-white/20 shrink-0"
              />
            ) : (
              <div className="w-7 h-10 bg-white/10 rounded-[3px] flex items-center justify-center text-[10px] shrink-0 font-bold">
                BK
              </div>
            )}
            <div className="truncate">
              <h3 className="text-sm font-bold truncate leading-tight">{book.title}</h3>
              <p className="text-[11px] text-[#A3E5CB] truncate flex items-center gap-1.5">
                <span>{book.author_name ? book.author_name.join(', ') : 'Authorized Author'}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-white/15 rounded text-[10px]">
                  <Sparkles className="w-2.5 h-2.5 text-[#A3E5CB]" />
                  Google Embedded Viewer
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Viewer toggle */}
            {(googleEmbedUrl || isResolvingGoogleBook) && archiveEmbedUrl && (
              <div className="hidden sm:flex items-center bg-black/25 p-0.5 rounded-[8px] text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveViewer('google')}
                  className={`px-2 py-1 rounded-[6px] font-semibold transition-colors ${
                    activeViewer === 'google' ? 'bg-[#146C4E] text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Google Book
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewer('archive')}
                  className={`px-2 py-1 rounded-[6px] font-semibold transition-colors ${
                    activeViewer === 'archive' ? 'bg-[#146C4E] text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Open Archive
                </button>
              </div>
            )}

            {/* Quick Dictionary lookup */}
            <button
              type="button"
              onClick={() => onOpenDictionaryWithWord?.(selectedText || 'entrepreneur')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#146C4E] hover:bg-[#208864] text-white rounded-[8px] text-xs font-semibold transition-colors"
              title="Look up word in dictionary"
            >
              <BookA className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {selectedText ? `Define "${selectedText}"` : 'Dictionary'}
              </span>
            </button>

            {/* Save to bookshelf */}
            <button
              type="button"
              onClick={() => {
                onSaveToBookshelf?.(book);
                setIsSaved(true);
              }}
              className={`p-2 rounded-[8px] border transition-colors ${
                isSaved
                  ? 'bg-white/20 text-[#A3E5CB] border-white/30'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
              }`}
              title={isSaved ? 'Saved to Bookshelf' : 'Save to Bookshelf'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>

            {/* External link */}
            <a
              href={activeViewer === 'google' && googleBooksUrl ? googleBooksUrl : iaId ? `https://archive.org/details/${iaId}` : openLibraryUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-[8px] bg-white/10 hover:bg-white/20 text-white border border-white/15"
              title="Open full book in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[8px] text-white/80 hover:text-white hover:bg-white/20 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reader Display Area */}
        <div
          className="flex-1 bg-[#2C3437] relative flex flex-col items-center justify-center overflow-hidden"
          onMouseUp={handleTextSelection}
        >
          {isResolvingGoogleBook ? (
            <div className="flex flex-col items-center gap-2 text-white/80 text-xs">
              <div className="w-8 h-8 border-2 border-white/20 border-t-[#A3E5CB] rounded-full animate-spin"></div>
              <span>Connecting to Google Embedded Book API...</span>
            </div>
          ) : activeViewer === 'google' && googleEmbedUrl ? (
            <iframe
              src={googleEmbedUrl}
              title={`Google Book Preview: ${book.title}`}
              className="w-full h-full border-0 bg-[#FFFFFF]"
              allowFullScreen
            />
          ) : activeViewer === 'archive' && archiveEmbedUrl ? (
            <iframe
              src={archiveEmbedUrl}
              title={`Internet Archive: ${book.title}`}
              className="w-full h-full border-0 bg-[#1D2427]"
              allowFullScreen
            />
          ) : googleEmbedUrl ? (
            <iframe
              src={googleEmbedUrl}
              title={`Google Book Preview: ${book.title}`}
              className="w-full h-full border-0 bg-[#FFFFFF]"
              allowFullScreen
            />
          ) : (
            <div className="text-center p-6 sm:p-8 max-w-md bg-white rounded-[16px] shadow-xl m-4 space-y-4">
              {book.cover_i ? (
                <img
                  src={`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`}
                  alt=""
                  className="w-28 h-40 object-cover mx-auto rounded-[8px] shadow-md border"
                />
              ) : (book as any).coverUrl ? (
                <img
                  src={(book as any).coverUrl}
                  alt=""
                  className="w-28 h-40 object-cover mx-auto rounded-[8px] shadow-md border"
                />
              ) : (
                <div className="w-20 h-28 bg-[#E7F4EE] rounded-[8px] mx-auto flex items-center justify-center text-[#146C4E]">
                  <BookOpen className="w-8 h-8" />
                </div>
              )}
              <div>
                <h4 className="text-base font-bold text-[#17211D]">{book.title}</h4>
                <p className="text-xs text-[#5E6964] mt-0.5">
                  By {book.author_name?.join(', ') || 'Authorized Author'}
                </p>
                <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 bg-[#E7F4EE] text-[#0F513B] rounded-[6px] text-xs font-semibold">
                  <Sparkles className="w-3 h-3 text-[#146C4E]" />
                  <span>Google Books & Open Library Catalog</span>
                </div>
              </div>

              <p className="text-xs text-[#5E6964] leading-relaxed">
                {book.description || 'This leadership & personal growth title is indexed in our team library. You can browse the preview or read online via Google Books.'}
              </p>

              <div className="space-y-2 pt-1">
                <a
                  href={googleBooksUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-bold rounded-[10px] inline-flex items-center justify-center gap-2 transition-colors shadow-2xs"
                >
                  <span>Open in Google Books Reader</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {openLibraryUrl && (
                  <a
                    href={openLibraryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 bg-[#F7F9F8] border border-[#CBD6D1] hover:bg-[#E9EFEC] text-[#17211D] text-xs font-semibold rounded-[10px] inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Read on Open Library Archive</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#5E6964]" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reader Bottom Bar: Reading Progress & Dictionary helper */}
        <div className="px-4 py-2.5 bg-white border-t border-[#E2E8E5] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[#5E6964] font-medium">Session Progress:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={readingProgress}
              onChange={(e) => setReadingProgress(Number(e.target.value))}
              className="w-24 sm:w-36 accent-[#146C4E]"
            />
            <span className="font-mono-numbers font-bold text-[#146C4E]">{readingProgress}%</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#5E6964]">
            <span className="hidden sm:inline">Tip: Highlight any word to define it</span>
            <button
              type="button"
              onClick={() => onOpenDictionaryWithWord?.(selectedText || 'discipline')}
              className="font-bold text-[#146C4E] hover:underline inline-flex items-center gap-1"
            >
              <BookA className="w-3.5 h-3.5" />
              <span>Free Dictionary</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
