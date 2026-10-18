
import React from 'react';
import { Slide } from '../types';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { 
  SortableContext, 
  horizontalListSortingStrategy, 
  sortableKeyboardCoordinates, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableSlideProps {
  slide: Slide;
  index: number;
  isCurrent: boolean;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onUpdateDuration: (id: string, duration: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDoubleClick?: () => void;
}

const SortableSlideItem: React.FC<SortableSlideProps> = ({
  slide,
  index,
  isCurrent,
  isSelected,
  isPlaying,
  onSelect,
  onUpdateDuration,
  onDuplicate,
  onDelete,
  onDoubleClick
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`group relative flex-shrink-0 w-32 h-20 rounded-xl border-2 cursor-pointer transition-all overflow-hidden flex flex-col select-none
        ${isSelected || isCurrent ? 'border-[#c0fa4a] ring-2 ring-[#c0fa4a]/20 shadow-[0_0_15px_rgba(192,250,74,0.15)] z-10' : 'border-[#263351] hover:border-[#3b4b72] bg-[#1a233a]'}
        ${isDragging ? 'shadow-2xl scale-105 z-50' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(e); }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(); }}
    >
        {isCurrent && isPlaying && (
            <div 
               className="absolute top-0 left-0 right-0 h-1 bg-[#c0fa4a] shadow-[0_0_8px_#c0fa4a] z-50 origin-left"
               style={{ 
                   animation: `scrubber ${(slide.transitionSpeed || 0.5) + (slide.duration || 5)}s linear forwards`
               }}
            />
        )}
        <style>{`
            @keyframes scrubber {
                0% { transform: scaleX(0); }
                100% { transform: scaleX(1); }
            }
        `}</style>
        {/* Index Badge (drag handle area) */}
        <div 
          {...attributes}
          {...listeners}
          className={`absolute top-0 left-0 px-2 py-0.5 rounded-br-lg text-[9px] font-black z-10 cursor-grab active:cursor-grabbing touch-none shadow-sm
            ${isSelected || isCurrent ? 'bg-[#c0fa4a] text-[#080b12]' : 'bg-[#080b12]/90 text-white backdrop-blur border-r border-b border-[#263351]'}`}
          title="Drag to reorder"
        >
           {index + 1}
        </div>
        
        {/* Mini Preview Placeholder */}
        <div className={`flex-1 relative overflow-hidden flex items-center justify-center p-2 ${isSelected || isCurrent ? 'bg-[#15803d]' : 'bg-[#0e1422] opacity-80'}`}>
            {isSelected || isCurrent ? (
                <div className="w-full h-full relative border border-white/20 rounded-sm">
                   <div className="absolute inset-y-0 left-1/2 w-px bg-white/20"></div>
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-white/20 rounded-full"></div>
                </div>
            ) : (
               <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            )}
        </div>

        {/* Footer Controls */}
        <div className={`border-t p-1 flex flex-col gap-0.5 relative z-20 cursor-default ${isSelected || isCurrent ? 'bg-[#c0fa4a] border-[#c0fa4a]' : 'bg-[#0e1422] border-[#263351]'}`} onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
           <span className={`text-[9px] truncate font-bold px-0.5 ${isSelected || isCurrent ? 'text-[#080b12]' : 'text-slate-300'}`}>{slide.name}</span>
           
           <div className="flex items-center justify-between">
              {/* Duration Control */}
              <div className={`flex items-center rounded-md border overflow-hidden shrink-0 ${isSelected || isCurrent ? 'bg-[#080b12]/10 border-black/10' : 'bg-[#1a233a] border-[#263351] hover:border-[#3b4b72]'}`}>
                   <button 
                     onClick={() => onUpdateDuration(slide.id, Math.max(0.5, (slide.duration || 5) - 0.5))}
                     className={`px-1 py-0.5 transition-colors shrink-0 ${isSelected || isCurrent ? 'hover:bg-black/10 text-[#080b12]' : 'hover:bg-[#263351] text-slate-400 hover:text-white'}`}
                   >
                     <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                   </button>
                   <input 
                      type="number" 
                      min="0.5"
                      step="0.5"
                      value={slide.duration || 5}
                      onChange={(e) => onUpdateDuration(slide.id, parseFloat(e.target.value))}
                      className={`w-5 text-center text-[9px] bg-transparent outline-none font-bold shrink-0 ${isSelected || isCurrent ? 'text-[#080b12]' : 'text-white'}`}
                      onPointerDown={e => e.stopPropagation()}
                      onKeyDown={e => e.stopPropagation()}
                   />
                   <span className={`text-[8px] mr-0.5 font-bold font-mono shrink-0 ${isSelected || isCurrent ? 'text-[#080b12]/60' : 'text-[#c0fa4a]'}`}>s</span>
                   <button 
                     onClick={() => onUpdateDuration(slide.id, (slide.duration || 5) + 0.5)}
                     className={`px-1 py-0.5 transition-colors shrink-0 ${isSelected || isCurrent ? 'hover:bg-black/10 text-[#080b12]' : 'hover:bg-[#263351] text-slate-400 hover:text-white'}`}
                   >
                     <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v12m-6-6h12" /></svg>
                   </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-0.5 shrink-0">
                  <button 
                    onClick={onDuplicate}
                    className={`p-1 rounded transition-colors ${isSelected || isCurrent ? 'hover:bg-black/10 text-[#080b12]/70 hover:text-[#080b12]' : 'hover:bg-[#263351] text-slate-400 hover:text-white'}`}
                    title="Duplicate"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                  </button>
                  <button 
                    onClick={onDelete}
                    className={`p-1 rounded transition-colors ${isSelected || isCurrent ? 'hover:bg-red-500/20 text-red-600 hover:text-red-700' : 'hover:bg-red-500/10 text-slate-400 hover:text-red-400'}`}
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
              </div>
           </div>
        </div>
    </div>
  );
};

interface TimelineProps {
  slides: Slide[];
  currentSlideId: string;
  selectedSlideIds: string[];
  onSelectSlide: (id: string, multi: boolean) => void;
  onClearSelection: () => void;
  onAddSlide: () => void;
  onDuplicateSlide: (id: string) => void;
  onDeleteSlide: (id: string) => void;
  onUpdateDuration: (id: string, duration: number) => void;
  onReorderSlides: (oldIndex: number, newIndex: number) => void;
  onPlay: () => void;
  isPlaying: boolean;
  onDoubleClickSlide?: () => void;
}

const Timeline: React.FC<TimelineProps> = ({
  onDoubleClickSlide,
  slides,
  currentSlideId,
  selectedSlideIds,
  onSelectSlide,
  onClearSelection,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onUpdateDuration,
  onReorderSlides,
  onPlay,
  isPlaying
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = slides.findIndex((slide) => slide.id === active.id);
      const newIndex = slides.findIndex((slide) => slide.id === over.id);
      onReorderSlides(oldIndex, newIndex);
    }
  };

  return (
    <div className="h-32 bg-[#0e1422] border-t border-[#1c2438] flex flex-col z-20 pb-2">
       <style>{`
          /* Hide Spin Buttons */
          input[type=number]::-webkit-inner-spin-button, 
          input[type=number]::-webkit-outer-spin-button { 
            -webkit-appearance: none; 
            margin: 0; 
          }
          input[type=number] {
            -moz-appearance: textfield;
          }
       `}</style>
       <div className="flex items-center px-4 pt-3 pb-2 justify-between bg-[#080b12] border-b border-[#1c2438]">
          <div className="flex items-center gap-3">
             <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Timeline</span>
             <span className="bg-[#1a233a] border border-[#263351] text-slate-300 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest shadow-inner">{slides.length} SLIDES</span>
          </div>
          <div className="flex gap-2">
            <button 
               onClick={onPlay}
               className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border
                 ${isPlaying ? 'bg-red-500/10 text-red-500 border-red-500/50 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-[#1a233a] text-[#c0fa4a] border-[#c0fa4a]/30 hover:border-[#c0fa4a] hover:bg-[#c0fa4a]/10 shadow-sm'}`}
            >
               {isPlaying ? '■ STOP' : '▶ PLAY ANIMATION'}
            </button>
            <button 
              onClick={onAddSlide}
              className="px-4 py-1.5 bg-[#c0fa4a] hover:bg-[#aee638] text-[#080b12] text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 shadow-[0_0_20px_rgba(192,250,74,0.25)]"
            >
              + New Slide
            </button>
          </div>
       </div>
       
       <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
       >
         <div 
           className="flex-1 overflow-x-auto overflow-y-hidden px-4 pt-2 pb-1 flex gap-3 items-center bg-[#0e1422] scrollbar-panel"
           onClick={onClearSelection}
         >
            <SortableContext
              items={slides.map(s => s.id)}
              strategy={horizontalListSortingStrategy}
            >
              {slides.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-60 hover:opacity-100 transition-opacity cursor-pointer border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-xl h-20 w-full" onClick={onAddSlide}>
                   <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                   <span className="text-[10px] font-bold uppercase tracking-wider">Add your first frame</span>
                </div>
              ) : (
                slides.map((slide, index) => (
                   <SortableSlideItem 
                     key={slide.id}
                   slide={slide}
                   index={index}
                   isCurrent={slide.id === currentSlideId}
                   isSelected={selectedSlideIds.includes(slide.id)}
                   isPlaying={isPlaying}
                   onSelect={(e) => onSelectSlide(slide.id, e.ctrlKey || e.metaKey || selectedSlideIds.length > 1)}
                   onUpdateDuration={onUpdateDuration}
                   onDuplicate={() => onDuplicateSlide(slide.id)}
                   onDelete={() => onDeleteSlide(slide.id)}
                  onDoubleClick={onDoubleClickSlide}
                 />
              )))}
            </SortableContext>
         </div>
       </DndContext>
    </div>
  );
};

export default Timeline;
