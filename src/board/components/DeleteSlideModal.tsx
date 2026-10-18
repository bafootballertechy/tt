import React from 'react';

interface DeleteSlideModalProps {
  slideToDelete: string[] | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteSlideModal: React.FC<DeleteSlideModalProps> = ({ slideToDelete, onConfirm, onCancel }) => {
  if (!slideToDelete || slideToDelete.length === 0) return null;
  
  const isMultiple = slideToDelete.length > 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl flex flex-col">
        <h2 className="text-lg font-bold text-white mb-2">{isMultiple ? `Delete ${slideToDelete.length} Slides` : 'Delete Slide'}</h2>
        <p className="text-slate-400 mb-6 text-sm">
          {isMultiple ? `Are you sure you want to delete these ${slideToDelete.length} slides? This action cannot be undone.` : 'Are you sure you want to delete this slide? This action cannot be undone.'}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteSlideModal;
