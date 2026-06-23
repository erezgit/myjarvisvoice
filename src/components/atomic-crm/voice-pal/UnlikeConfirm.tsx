interface UnlikeConfirmProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UnlikeConfirm({ isOpen, onConfirm, onCancel }: UnlikeConfirmProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-2xl shadow-xl px-8 py-6 max-w-xs text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-[#1a1a1a] font-medium mb-5">
          Remove from your likes?
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 text-sm text-[#666] bg-[#f0f0f0] hover:bg-[#e5e5e5] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
