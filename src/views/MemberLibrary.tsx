import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { BookItem, SavedBookRecord } from '../types/index.ts';
import { BookReaderModal } from '../components/BookReaderModal.tsx';
import { DictionaryModal } from '../components/DictionaryModal.tsx';
import {
  BookOpen, Search, BookA, Bookmark, BookmarkCheck,
  CheckCircle2, RefreshCw, Library, BookMarked, X,
} from 'lucide-react';

const DEFAULT_SEARCH = 'personal development entrepreneurship leadership';

export const MemberLibrary: React.FC = () => {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [books, setBooks] = useState<BookItem[]>([]);
  const [savedBooks, setSavedBooks] = useState<SavedBookRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'bookshelf'>('catalog');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeReadingBook, setActiveReadingBook] = useState<BookItem | null>(null);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [dictionaryWord, setDictionaryWord] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchBooks = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const q = query.trim() || DEFAULT_SEARCH;
      const googleRes = await fetch(`/api/library/google-books?q=${encodeURIComponent(q)}`);
      if (googleRes.ok) {
        const data = await googleRes.json();
        if (data.books && data.books.length > 0) {
          setBooks(data.books);
          setIsLoading(false);
          return;
        }
      }
      const openRes = await fetch(`/api/library/books?category=Personal+Growth&search=${encodeURIComponent(q)}`);
      if (openRes.ok) {
        const data = await openRes.json();
        setBooks(data.books || []);
      }
    } catch (err) {
      console.error('Failed to fetch books:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSavedBooks = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/library/saved?userId=${user.id}`);
      if (res.ok) setSavedBooks(await res.json());
    } catch (err) {
      console.error('Failed to load saved books:', err);
    }
  };

  useEffect(() => { fetchBooks(DEFAULT_SEARCH); }, [fetchBooks]);
  useEffect(() => { fetchSavedBooks(); }, [user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    setSearchQuery(q);
    fetchBooks(q || DEFAULT_SEARCH);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    fetchBooks(DEFAULT_SEARCH);
  };

  const handleSaveBook = async (book: BookItem) => {
    if (!user) return;
    try {
      const res = await fetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          bookKey: book.key,
          title: book.title,
          author: book.author_name ? book.author_name.join(', ') : 'Unknown',
          coverId: book.cover_i,
          iaId: book.ia && book.ia.length > 0 ? book.ia[0] : undefined,
          category: 'General',
        }),
      });
      if (res.ok) {
        setToastMessage(`Saved to bookshelf!`);
        setTimeout(() => setToastMessage(null), 3000);
        fetchSavedBooks();
      }
    } catch (err) {
      console.error('Failed to save book:', err);
    }
  };

  const isBookSaved = (bookKey: string) => savedBooks.some((b) => b.bookKey === bookKey);
  const openDictionaryWith = (word: string) => { setDictionaryWord(word); setIsDictionaryOpen(true); };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24">
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 p-3 bg-[#146C4E] text-white text-xs font-semibold rounded-[10px] shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E2E8E5] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#146C4E] uppercase tracking-wider mb-1">
            <Library className="w-4 h-4" />
            <span>Growth Library</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211D]">Reading Library</h1>
          <p className="text-xs text-[#5E6964] mt-0.5">Google Books · Open Library · Dictionary</p>
        </div>
        <button
          type="button"
          onClick={() => openDictionaryWith('discipline')}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#E7F4EE] hover:bg-[#D5EFE3] border border-[#CBD6D1] text-[#0F513B] text-xs font-bold rounded-[10px] transition-colors self-start sm:self-auto"
        >
          <BookA className="w-4 h-4 text-[#146C4E]" />
          <span>Dictionary</span>
        </button>
      </div>

      <div className="flex rounded-[12px] bg-[#F7F9F8] p-1 border border-[#E2E8E5]">
        <button
          type="button" onClick={() => setActiveTab('catalog')}
          className={`flex-1 py-2 text-xs font-bold rounded-[8px] transition-all flex items-center justify-center gap-1.5 ${activeTab === 'catalog' ? 'bg-white text-[#17211D] shadow-xs' : 'text-[#5E6964] hover:text-[#17211D]'}`}
        >
          <BookOpen className="w-4 h-4 text-[#146C4E]" />
          <span>Browse Library</span>
        </button>
        <button
          type="button" onClick={() => setActiveTab('bookshelf')}
          className={`flex-1 py-2 text-xs font-bold rounded-[8px] transition-all flex items-center justify-center gap-1.5 ${activeTab === 'bookshelf' ? 'bg-white text-[#17211D] shadow-xs' : 'text-[#5E6964] hover:text-[#17211D]'}`}
        >
          <BookMarked className="w-4 h-4 text-[#146C4E]" />
          <span>My Bookshelf ({savedBooks.length})</span>
        </button>
      </div>

      {activeTab === 'catalog' ? (
        <>
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#89928E]" />
              <input
                type="text" value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search any book, author, or topic..."
                className="w-full h-11 pl-9 pr-9 bg-white border border-[#CBD6D1] rounded-[10px] text-sm text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E] placeholder:text-[#89928E]"
              />
              {searchInput && (
                <button type="button" onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#89928E] hover:text-[#17211D]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button type="submit" className="px-5 h-11 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-bold rounded-[10px] transition-colors whitespace-nowrap">
              Search
            </button>
          </form>

          {searchQuery && (
            <div className="flex items-center gap-2 text-xs text-[#5E6964]">
              <span>Results for: <strong className="text-[#17211D]">"{searchQuery}"</strong></span>
              <button type="button" onClick={handleClearSearch} className="text-[#146C4E] hover:underline font-semibold">Clear</button>
            </div>
          )}

          <div className="bg-white rounded-[18px] border border-[#E2E8E5] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E2E8E5]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#146C4E]" />
                <h2 className="text-sm font-bold text-[#17211D]">
                  {searchQuery ? `"${searchQuery}"` : 'Recommended Books'}
                </h2>
                {!isLoading && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#E7F4EE] text-[#0F513B] font-semibold">{books.length}</span>
                )}
              </div>
              <button type="button" onClick={() => fetchBooks(searchQuery || DEFAULT_SEARCH)}
                className="p-1.5 text-[#5E6964] hover:text-[#17211D] rounded-[6px] hover:bg-[#F7F9F8]">
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2 animate-pulse">
                    <div className="h-44 bg-[#E9EFEC] rounded-[10px]"></div>
                    <div className="h-3 bg-[#E9EFEC] rounded w-3/4"></div>
                    <div className="h-3 bg-[#E9EFEC] rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : books.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-[#CBD6D1] mx-auto" />
                <p className="text-xs font-semibold text-[#17211D]">No books found</p>
                <p className="text-[11px] text-[#5E6964]">Try a different search term.</p>
                <button type="button" onClick={handleClearSearch}
                  className="px-3 py-1.5 bg-[#146C4E] text-white text-xs font-semibold rounded-[8px]">Browse Default Books</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {books.map((book) => {
                  const saved = isBookSaved(book.key);
                  const author = book.author_name ? book.author_name[0] : 'Author';
                  return (
                    <div key={book.key}
                      className="group bg-[#F7F9F8] border border-[#CBD6D1] rounded-[14px] p-2.5 sm:p-3 flex flex-col justify-between hover:shadow-md hover:border-[#146C4E] transition-all">
                      <div>
                        <div className="relative aspect-[3/4] rounded-[8px] overflow-hidden bg-[#E2E8E5] mb-2.5 shadow-2xs">
                          {book.cover_i ? (
                            <img src={`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`} alt={book.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                          ) : (book as any).coverUrl ? (
                            <img src={(book as any).coverUrl} alt={book.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-b from-[#E7F4EE] to-[#CBD6D1]">
                              <BookOpen className="w-7 h-7 text-[#146C4E] mb-1" />
                              <span className="text-[10px] font-bold text-[#17211D] line-clamp-2 leading-tight">{book.title}</span>
                            </div>
                          )}
                          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-[4px] bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white uppercase tracking-wider">
                            {book.source === 'googlebooks' || book.googleBookId ? 'Google' : 'Public'}
                          </div>
                        </div>
                        <h3 className="text-[11px] sm:text-xs font-bold text-[#17211D] line-clamp-2 leading-snug group-hover:text-[#146C4E]">{book.title}</h3>
                        <p className="text-[10px] sm:text-[11px] text-[#5E6964] mt-0.5 truncate">{author}</p>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-[#E2E8E5] flex items-center gap-1.5">
                        <button type="button" onClick={() => setActiveReadingBook(book)}
                          className="flex-1 py-1.5 bg-[#146C4E] hover:bg-[#0F513B] text-white text-[10px] sm:text-[11px] font-bold rounded-[8px] transition-colors flex items-center justify-center gap-1">
                          <BookOpen className="w-3 h-3" /><span>Read</span>
                        </button>
                        <button type="button" onClick={() => handleSaveBook(book)}
                          className={`p-1.5 rounded-[8px] border transition-colors ${saved ? 'bg-[#E7F4EE] border-[#146C4E] text-[#146C4E]' : 'bg-white border-[#CBD6D1] text-[#5E6964] hover:bg-[#F7F9F8]'}`}
                          title={saved ? 'Saved' : 'Save'}>
                          {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-[18px] border border-[#E2E8E5] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E5]">
            <div className="flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-[#146C4E]" />
              <h2 className="text-sm font-bold text-[#17211D]">My Bookshelf</h2>
            </div>
            <span className="text-xs font-semibold text-[#5E6964]">{savedBooks.length} Books</span>
          </div>
          {savedBooks.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Bookmark className="w-10 h-10 text-[#CBD6D1] mx-auto" />
              <p className="text-xs font-semibold text-[#17211D]">Your bookshelf is empty</p>
              <p className="text-[11px] text-[#5E6964]">Search and save books to build your reading list.</p>
              <button type="button" onClick={() => setActiveTab('catalog')}
                className="px-4 py-2 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-bold rounded-[8px] transition-colors">Browse Books</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {savedBooks.map((item) => (
                <div key={item.id} className="bg-[#F7F9F8] border border-[#CBD6D1] rounded-[12px] p-3 flex flex-col justify-between">
                  <div className="flex items-start gap-3">
                    {item.coverId ? (
                      <img src={`https://covers.openlibrary.org/b/id/${item.coverId}-S.jpg`} alt=""
                        className="w-10 h-14 object-cover rounded-[4px] border shrink-0" />
                    ) : (
                      <div className="w-10 h-14 bg-[#CBD6D1] rounded-[4px] flex items-center justify-center text-[10px] font-bold text-white shrink-0">BK</div>
                    )}
                    <div className="truncate flex-1">
                      <h4 className="text-xs font-bold text-[#17211D] truncate leading-tight">{item.title}</h4>
                      <p className="text-[11px] text-[#5E6964] truncate mt-0.5">{item.author}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#E2E8E5]">
                    <div className="flex items-center justify-between text-[11px] text-[#5E6964] mb-1.5">
                      <span>Progress</span>
                      <strong className="text-[#146C4E]">{item.progressPercent}%</strong>
                    </div>
                    <div className="w-full bg-[#E2E8E5] h-1.5 rounded-full overflow-hidden mb-2.5">
                      <div style={{ width: `${item.progressPercent}%` }} className="bg-[#146C4E] h-full" />
                    </div>
                    <button type="button"
                      onClick={() => setActiveReadingBook({ key: item.bookKey, title: item.title, author_name: [item.author], cover_i: item.coverId, ia: item.iaId ? [item.iaId] : undefined })}
                      className="w-full py-1.5 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-bold rounded-[8px] transition-colors flex items-center justify-center gap-1">
                      <BookOpen className="w-3 h-3" /><span>Continue Reading</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <BookReaderModal isOpen={Boolean(activeReadingBook)} onClose={() => setActiveReadingBook(null)}
        book={activeReadingBook} onOpenDictionaryWithWord={openDictionaryWith} onSaveToBookshelf={handleSaveBook} />
      <DictionaryModal isOpen={isDictionaryOpen} onClose={() => setIsDictionaryOpen(false)} initialWord={dictionaryWord} />
    </div>
  );
};
