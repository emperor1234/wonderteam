import React, { useState, useEffect } from 'react';
import { BookItem } from '../types/index.ts';
import { X, ExternalLink, BookA, Bookmark, Sparkles, BookOpen, FileText, CheckCircle2 } from 'lucide-react';

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
  const [readingProgress, setReadingProgress] = useState(25);
  const [isSaved, setIsSaved] = useState(false);
  const [modalTab, setModalTab] = useState<'overview' | 'reader'>('overview');
  const [activeViewer, setActiveViewer] = useState<'google' | 'archive'>('google');
  const [googleBookId, setGoogleBookId] = useState<string | null>(null);
  const [isResolvingGoogleBook, setIsResolvingGoogleBook] = useState(false);

  useEffect(() => {
    if (!book) return;
    setIsSaved(false);
    setSelectedText('');
    setModalTab('overview');

    if (book.googleBookId) {
      setGoogleBookId(book.googleBookId);
      setActiveViewer('google');
    } else {
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
          } else if (book.ia && book.ia.length > 0) {
            setActiveViewer('archive');
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

  const googleEmbedUrl = googleBookId
    ? `https://books.google.com/books?id=${googleBookId}&lpg=PP1&pg=PP1&output=embed`
    : null;

  const openLibraryUrl = `https://openlibrary.org${book.key}`;
  const googleBooksUrl = googleBookId
    ? `https://books.google.com/books?id=${googleBookId}`
    : `https://www.google.com/search?tbm=bks&q=${encodeURIComponent(book.title)}`;

  const coverSrc = book.cover_i
    ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
    : (book as any).coverUrl;

  const handleTextSelection = () => {
    const text = window.getSelection()?.toString().trim();
    if (text && text.length > 1 && text.length < 50) {
      setSelectedText(text);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl h-[94vh] rounded-[18px] border-2 border-[#146C4E] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Controls Header */}
        <div className="px-4 py-3 bg-[#0F513B] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 truncate">
            {coverSrc ? (
              <img
                src={coverSrc}
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
                  {book.category || 'Growth Library'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Switcher: Overview vs Live Reader */}
            <div className="flex items-center bg-black/25 p-0.5 rounded-[8px] text-[11px]">
              <button
                type="button"
                onClick={() => setModalTab('overview')}
                className={`px-2.5 py-1 rounded-[6px] font-semibold transition-colors flex items-center gap-1 ${
                  modalTab === 'overview' ? 'bg-[#146C4E] text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>Overview</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('reader')}
                className={`px-2.5 py-1 rounded-[6px] font-semibold transition-colors flex items-center gap-1 ${
                  modalTab === 'reader' ? 'bg-[#146C4E] text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>Reader Preview</span>
              </button>
            </div>

            {/* Quick Dictionary lookup */}
            <button
              type="button"
              onClick={() => onOpenDictionaryWithWord?.(selectedText || 'discipline')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#146C4E] hover:bg-[#208864] text-white rounded-[8px] text-xs font-semibold transition-colors"
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

            {/* External Direct Link */}
            <a
              href={googleBookId ? googleBooksUrl : iaId ? `https://archive.org/details/${iaId}` : openLibraryUrl}
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

        {/* Reader Display Body */}
        <div
          className="flex-1 bg-[#F7F9F8] relative flex flex-col overflow-y-auto"
          onMouseUp={handleTextSelection}
        >
          {modalTab === 'overview' ? (
            /* Tab 1: Comprehensive Executive Overview */
            <div className="max-w-2xl mx-auto p-5 sm:p-8 space-y-6 w-full">
              <div className="flex flex-col sm:flex-row gap-5 items-start bg-white p-5 rounded-[16px] border border-[#E2E8E5] shadow-xs">
                {coverSrc ? (
                  <img
                    src={coverSrc}
                    alt={book.title}
                    className="w-28 sm:w-36 aspect-[3/4] object-cover rounded-[10px] shadow-md border border-[#E2E8E5] shrink-0 mx-auto sm:mx-0"
                  />
                ) : (
                  <div className="w-28 sm:w-36 aspect-[3/4] bg-[#E7F4EE] rounded-[10px] flex items-center justify-center text-[#146C4E] shrink-0 mx-auto sm:mx-0">
                    <BookOpen className="w-10 h-10" />
                  </div>
                )}
                <div className="space-y-2 flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E7F4EE] text-[#0F513B] text-[11px] font-bold">
                    <span>{book.category || 'Personal Growth'}</span>
                    {book.first_publish_year && <span>· {book.first_publish_year}</span>}
                  </div>
                  <h2 className="text-xl font-black text-[#17211D] leading-tight">
                    {book.title}
                  </h2>
                  <p className="text-xs font-semibold text-[#5E6964]">
                    By {book.author_name?.join(', ') || 'Authorized Author'}
                  </p>
                  <p className="text-xs text-[#17211D] leading-relaxed pt-2">
                    {book.description ||
                      'This high-impact business and personal development book is indexed in our team library to strengthen daily execution, networking mindset, and team leadership.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={googleBooksUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 bg-[#146C4E] hover:bg-[#0F513B] text-white rounded-[12px] font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Read on Google Books</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#A3E5CB]" />
                </a>

                {iaId ? (
                  <a
                    href={`https://archive.org/details/${iaId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3.5 bg-white border border-[#CBD6D1] hover:bg-[#E9EFEC] text-[#17211D] rounded-[12px] font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <BookOpen className="w-4 h-4 text-[#146C4E]" />
                    <span>Read on Internet Archive</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#5E6964]" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setModalTab('reader')}
                    className="p-3.5 bg-white border border-[#CBD6D1] hover:bg-[#E9EFEC] text-[#17211D] rounded-[12px] font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <BookOpen className="w-4 h-4 text-[#146C4E]" />
                    <span>Open Interactive Preview</span>
                  </button>
                )}
              </div>

              {/* Study & Reading Note */}
              <div className="p-4 bg-[#E7F4EE] rounded-[14px] border border-[#CBD6D1] space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0F513B]">
                  <CheckCircle2 className="w-4 h-4 text-[#146C4E]" />
                  <span>WonderTeam Reading Method</span>
                </div>
                <p className="text-xs text-[#17211D] leading-relaxed">
                  Read at least 15 minutes before your morning standup or during your evening review. Highlight key terms and look up definitions using our built-in dictionary.
                </p>
              </div>
            </div>
          ) : (
            /* Tab 2: Live Embedded Preview */
            <div className="flex-1 w-full h-full relative flex flex-col items-center justify-center bg-[#2C3437]">
              {/* Viewer selector bar */}
              <div className="w-full bg-[#1F2628] px-4 py-2 flex items-center justify-between text-xs text-white/80 shrink-0">
                <div className="flex items-center gap-2">
                  <span>Viewer:</span>
                  {googleEmbedUrl && (
                    <button
                      type="button"
                      onClick={() => setActiveViewer('google')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        activeViewer === 'google' ? 'bg-[#146C4E] text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Google Preview
                    </button>
                  )}
                  {archiveEmbedUrl && (
                    <button
                      type="button"
                      onClick={() => setActiveViewer('archive')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        activeViewer === 'archive' ? 'bg-[#146C4E] text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Internet Archive
                    </button>
                  )}
                </div>
                <a
                  href={activeViewer === 'google' ? googleBooksUrl : archiveEmbedUrl || openLibraryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#A3E5CB] hover:underline flex items-center gap-1 text-[11px]"
                >
                  <span>Open in Full Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {isResolvingGoogleBook ? (
                <div className="flex flex-col items-center gap-2 text-white/80 text-xs py-12">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-[#A3E5CB] rounded-full animate-spin"></div>
                  <span>Connecting to book reader stream...</span>
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
                <div className="text-center p-6 max-w-sm bg-white rounded-[16px] shadow-xl m-4 space-y-3">
                  <BookOpen className="w-8 h-8 text-[#146C4E] mx-auto" />
                  <h4 className="text-sm font-bold text-[#17211D]">{book.title}</h4>
                  <p className="text-xs text-[#5E6964]">
                    Interactive embedded frame is not available for this edition. You can open and read it directly on Google Books or Open Library.
                  </p>
                  <a
                    href={googleBooksUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-bold rounded-[8px] inline-flex items-center justify-center gap-1.5"
                  >
                    <span>Read on Google Books</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Bar: Session Progress & Dictionary quick define */}
        <div className="px-4 py-2.5 bg-white border-t border-[#E2E8E5] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[#5E6964] font-medium">Session Progress:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={readingProgress}
              onChange={(e) => setReadingProgress(parseInt(e.target.value, 10))}
              className="w-24 sm:w-32 accent-[#146C4E] cursor-pointer"
            />
            <span className="font-bold text-[#146C4E]">{readingProgress}%</span>
          </div>

          <div className="flex items-center gap-2">
            {selectedText ? (
              <span className="text-[11px] text-[#146C4E] bg-[#E7F4EE] px-2 py-0.5 rounded font-medium truncate max-w-xs">
                Selected: "{selectedText}"
              </span>
            ) : (
              <span className="text-[11px] text-[#89928E] hidden sm:inline">
                Highlight any text on screen to look up in dictionary
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
