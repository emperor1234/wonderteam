import React, { useState } from 'react';
import { DictionaryEntry } from '../types/index.ts';
import { Search, X, Volume2, BookA, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

interface DictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWord?: string;
}

export const DictionaryModal: React.FC<DictionaryModalProps> = ({
  isOpen,
  onClose,
  initialWord = '',
}) => {
  const [searchWord, setSearchWord] = useState(initialWord);
  const [results, setResults] = useState<DictionaryEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState(false);

  // Suggested high-yield growth words
  const quickWords = [
    'discipline',
    'punctuality',
    'integrity',
    'leadership',
    'productivity',
    'mindfulness',
  ];

  const handleLookup = async (wordToSearch?: string) => {
    const query = (wordToSearch || searchWord).trim().toLowerCase();
    if (!query) return;

    setIsLoading(true);
    setError(null);
    setSearchWord(query);

    try {
      // Backend proxy to Free Dictionary API as strictly requested
      const res = await fetch(`/api/dictionary/${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `No definition found for "${query}"`);
      }

      if (Array.isArray(data) && data.length > 0) {
        setResults(data);
      } else {
        throw new Error(`No definition entries returned for "${query}"`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve word definition');
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAudio = (audioUrl?: string) => {
    if (!audioUrl) return;
    try {
      const fullUrl = audioUrl.startsWith('//') ? `https:${audioUrl}` : audioUrl;
      const audio = new Audio(fullUrl);
      setPlayingAudio(true);
      audio.onended = () => setPlayingAudio(false);
      audio.onerror = () => setPlayingAudio(false);
      audio.play();
    } catch {
      setPlayingAudio(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-[18px] border border-[#CBD6D1] shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#F7F9F8] border-b border-[#E2E8E5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] bg-[#146C4E] text-white flex items-center justify-center shadow-2xs">
              <BookA className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#17211D]">English & Business Dictionary</h2>
              <p className="text-[10px] text-[#5E6964]">Free Dictionary API · Backend Verified</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[6px] text-[#89928E] hover:text-[#17211D] hover:bg-[#E9EFEC]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#E2E8E5] bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#89928E]" />
              <input
                type="text"
                value={searchWord}
                onChange={(e) => setSearchWord(e.target.value)}
                placeholder="Search word (e.g. discipline, punctuality, leadership)..."
                className="w-full h-10 pl-9 pr-3 bg-[#F7F9F8] border border-[#CBD6D1] rounded-[10px] text-xs font-medium text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !searchWord.trim()}
              className="px-4 h-10 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-bold rounded-[10px] transition-colors disabled:opacity-50 shadow-2xs"
            >
              {isLoading ? 'Searching...' : 'Define'}
            </button>
          </form>

          {/* Quick Words Chips */}
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]">
            <span className="text-[#89928E] font-medium shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#146C4E]" />
              <span>Quick:</span>
            </span>
            {quickWords.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => handleLookup(w)}
                className="px-2 py-0.5 rounded-[6px] bg-[#E7F4EE] hover:bg-[#D5EFE3] text-[#0F513B] font-medium capitalize shrink-0 transition-colors"
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Definition Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3.5 bg-[#FFF0F0] border border-[#C84C4C] rounded-[12px] text-xs text-[#C84C4C] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Lookup Unsuccessful</div>
                <div className="text-[11px] mt-0.5 opacity-90">{error}</div>
              </div>
            </div>
          )}

          {results ? (
            results.map((entry, idx) => {
              const audioObj = entry.phonetics?.find((p) => p.audio && p.audio.length > 0);

              return (
                <div key={idx} className="space-y-4 animate-in fade-in duration-150">
                  {/* Word Title & Phonetics Banner */}
                  <div className="flex items-center justify-between border-b border-[#E2E8E5] pb-3">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-[#17211D] capitalize tracking-tight">
                        {entry.word}
                      </h3>
                      {entry.phonetic && (
                        <p className="text-xs font-mono text-[#146C4E] mt-0.5">
                          {entry.phonetic}
                        </p>
                      )}
                    </div>

                    {audioObj?.audio && (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(audioObj.audio)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border text-xs font-semibold transition-all ${
                          playingAudio
                            ? 'bg-[#146C4E] text-white border-[#146C4E] scale-95'
                            : 'bg-[#E7F4EE] hover:bg-[#D5EFE3] text-[#0F513B] border-[#CBD6D1]'
                        }`}
                        title="Listen to pronunciation"
                      >
                        <Volume2 className={`w-4 h-4 ${playingAudio ? 'animate-pulse' : ''}`} />
                        <span>Pronounce</span>
                      </button>
                    )}
                  </div>

                  {/* Origin */}
                  {entry.origin && (
                    <div className="p-2.5 bg-[#F7F9F8] rounded-[8px] text-[11px] text-[#5E6964] border border-[#E2E8E5]">
                      <strong className="text-[#17211D]">Etymology / Origin: </strong>
                      {entry.origin}
                    </div>
                  )}

                  {/* Meanings */}
                  <div className="space-y-3.5">
                    {entry.meanings?.map((meaning, mIdx) => (
                      <div
                        key={mIdx}
                        className="bg-[#FAFBFB] p-3.5 rounded-[12px] border border-[#E2E8E5]"
                      >
                        <div className="inline-block px-2 py-0.5 bg-[#E7F4EE] text-[#0F513B] rounded-[4px] text-[10px] font-bold uppercase tracking-wider mb-2">
                          {meaning.partOfSpeech}
                        </div>

                        <ol className="space-y-2.5 list-decimal list-inside text-xs text-[#17211D]">
                          {meaning.definitions?.slice(0, 4).map((def, dIdx) => (
                            <li key={dIdx} className="leading-relaxed">
                              <span className="font-medium">{def.definition}</span>

                              {def.example && (
                                <p className="text-[11px] text-[#5E6964] italic mt-0.5 pl-4 border-l-2 border-[#CBD6D1] my-1">
                                  "{def.example}"
                                </p>
                              )}

                              {def.synonyms && def.synonyms.length > 0 && (
                                <div className="text-[10px] text-[#146C4E] mt-1 pl-4 flex flex-wrap items-center gap-1">
                                  <strong className="font-semibold text-[#5E6964]">Synonyms:</strong>
                                  {def.synonyms.slice(0, 5).map((syn, sIdx) => (
                                    <button
                                      key={sIdx}
                                      type="button"
                                      onClick={() => handleLookup(syn)}
                                      className="underline hover:text-[#0F513B]"
                                    >
                                      {syn}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : !error && !isLoading ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#E7F4EE] text-[#146C4E] flex items-center justify-center mx-auto">
                <BookA className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-[#17211D]">Look Up Any English Term</h4>
              <p className="text-[11px] text-[#5E6964] max-w-xs mx-auto">
                Instant definitions, part of speech, audio pronunciations, and examples while reading your study books.
              </p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-[#F7F9F8] border-t border-[#E2E8E5] px-5 py-2.5 flex items-center justify-between text-[11px] text-[#5E6964]">
          <span>WonderTeam Academic Reference</span>
          <button
            onClick={onClose}
            className="text-xs font-bold text-[#146C4E] hover:underline"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
