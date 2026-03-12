export default function ProductMockup() {
  return (
    <div className="relative mx-auto max-w-4xl">
      {/* Browser chrome */}
      <div className="rounded-xl border border-[#262626] bg-[#141414] shadow-2xl shadow-black/50 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] bg-[#0a0a0a] px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-amber-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <div className="mx-auto flex h-6 max-w-[60%] items-center justify-center rounded-md bg-[#141414] border border-[#262626] px-3 text-[10px] text-neutral-500 font-mono truncate">
            salesblitz.ai/runs/4f8a...
          </div>
        </div>

        {/* App content */}
        <div className="bg-[#0a0a0a] p-6">
          {/* Status header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Prospect Prep: Acme Corp</h3>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Delivered
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-neutral-400">
                Jamie Torres, VP Revenue Operations &bull; 4 min ago
              </p>
            </div>
          </div>

          {/* Asset cards grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Context File */}
            <div className="group rounded-lg border border-[#262626] bg-[#141414] p-3 transition hover:border-emerald-500/20 hover:shadow-sm shadow-black/20">
              <div className="flex h-20 items-center justify-center rounded-md bg-gradient-to-br from-blue-50 to-blue-100 mb-2">
                <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-[11px] font-semibold text-white leading-tight">Context File</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">NotebookLM-ready</p>
            </div>

            {/* POV Deck */}
            <div className="group rounded-lg border border-[#262626] bg-[#141414] p-3 transition hover:border-emerald-500/20 hover:shadow-sm shadow-black/20">
              <div className="flex h-20 items-center justify-center rounded-md bg-gradient-to-br from-emerald-50 to-emerald-100 mb-2">
                <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                </svg>
              </div>
              <p className="text-[11px] font-semibold text-white leading-tight">POV Deck</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">Google Slides-ready</p>
            </div>

            {/* On-Screen Notes */}
            <div className="group rounded-lg border border-[#262626] bg-[#141414] p-3 transition hover:border-emerald-500/20 hover:shadow-sm shadow-black/20">
              <div className="flex h-20 items-center justify-center rounded-md bg-gradient-to-br from-amber-50 to-amber-100 mb-2">
                <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
              <p className="text-[11px] font-semibold text-white leading-tight">On-Screen Notes</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">Live call reference</p>
            </div>

            {/* Outreach Sequence */}
            <div className="group rounded-lg border border-[#262626] bg-[#141414] p-3 transition hover:border-emerald-500/20 hover:shadow-sm shadow-black/20">
              <div className="flex h-20 items-center justify-center rounded-md bg-gradient-to-br from-violet-50 to-violet-100 mb-2">
                <svg className="h-8 w-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <p className="text-[11px] font-semibold text-white leading-tight">Outreach Sequence</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">Multi-touch emails</p>
            </div>
          </div>

          {/* Subtle "more assets" indicator */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <div className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
            <span className="ml-1 text-[10px] text-neutral-500">+ AI Practice Mode</span>
          </div>
        </div>
      </div>

      {/* Floating accent elements */}
      <div className="absolute -bottom-3 -right-3 h-24 w-24 rounded-2xl bg-gradient-to-br from-emerald-100 to-green-100 -z-10 blur-sm" />
      <div className="absolute -top-3 -left-3 h-16 w-16 rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 -z-10 blur-sm" />
    </div>
  );
}
