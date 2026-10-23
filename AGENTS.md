<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Order submission
- Guest checkout uses a validated TanStack server function and an insert-only database RPC; customer order tables remain inaccessible to visitors to prevent order browsing.
- The database RPC owns menu pricing and atomically persists item snapshots; keep its catalog synchronized with menu changes so client totals cannot override actual prices.
- Reuse a random request ID for retries of an unchanged cart; the database returns the original receipt to avoid duplicate orders after network failures.
