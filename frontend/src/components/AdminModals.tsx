import React from 'react';

interface AdminModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  submitLabel?: string;
  loading?: boolean;
}

const AdminModal: React.FC<AdminModalProps> = ({
  open,
  title,
  children,
  onClose,
  onSubmit,
  submitLabel = 'Lưu',
  loading = false,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 relative animate-fadeIn">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">{children}</div>
          {onSubmit && (
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={onClose}
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Đang lưu...' : submitLabel}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AdminModal; 