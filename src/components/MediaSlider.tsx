import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface MediaSliderProps {
  screenshots: string[];
  trailerUrl?: string;
}

export const MediaSlider: React.FC<MediaSliderProps> = ({ screenshots, trailerUrl }) => {
  const media = [
    ...(trailerUrl ? [{ type: 'video', url: trailerUrl }] : []),
    ...screenshots.map(url => ({ type: 'image', url }))
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => setCurrentIndex((prev) => (prev + 1) % media.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);

  if (media.length === 0) return null;

  return (
    <div className="relative w-full aspect-video bg-zinc-900 border border-white/5 overflow-hidden group">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          {media[currentIndex].type === 'image' ? (
            <img
              src={media[currentIndex].url}
              alt={`Media ${currentIndex + 1}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <iframe
              src={media[currentIndex].url.replace('watch?v=', 'embed/')}
              className="w-full h-full"
              allowFullScreen
              title="Trailer"
            />
          )}
        </motion.div>
      </AnimatePresence>

      <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/70 transition-colors">
        <ChevronLeft />
      </button>
      <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/70 transition-colors">
        <ChevronRight />
      </button>
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {media.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-2 h-2 rounded-full ${i === currentIndex ? 'bg-[#00F0FF]' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
};
