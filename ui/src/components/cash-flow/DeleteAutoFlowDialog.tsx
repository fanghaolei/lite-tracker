import { formatShortDate, type DeleteChoice } from '../../domain/cashFlow';

type DeleteAutoFlowDialogProps = {
  choice: DeleteChoice | null;
  onDeleteSingle: () => void;
  onDeleteEntire: () => void;
  onCancel: () => void;
};

export function DeleteAutoFlowDialog({
  choice,
  onDeleteSingle,
  onDeleteEntire,
  onCancel
}: DeleteAutoFlowDialogProps) {
  if (!choice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-emerald-600">Delete Auto Flow</h3>
        <p className="mt-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
          Delete {choice.item.name} on {formatShortDate(choice.item.due_date)} only, or remove the entire recurring flow?
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={onDeleteSingle} className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-200">
            One Time
          </button>
          <button type="button" onClick={onDeleteEntire} className="rounded-xl bg-red-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-200">
            Entire Flow
          </button>
          <button type="button" onClick={onCancel} className="rounded-xl bg-gray-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
