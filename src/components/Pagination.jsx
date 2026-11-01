export default function Pagination({ page, pageSize, total, onPageChange }) {
  if (total < pageSize) return null

  const pageCount = Math.ceil(total / pageSize)
  const firstItem = (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, total)

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3"
    >
      <p className="text-sm text-[var(--muted)]">
        Showing {firstItem}–{lastItem} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="cursor-pointer rounded-md border border-[var(--line)] px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-[var(--muted)]" aria-live="polite">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pageCount}
          className="cursor-pointer rounded-md border border-[var(--line)] px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </nav>
  )
}
