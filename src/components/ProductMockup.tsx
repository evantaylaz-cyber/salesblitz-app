export default function ProductMockup() {
  return (
    <div className="relative mx-auto max-w-4xl">
      {/* Browser chrome */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/50 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-amber-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <div className="mx-auto flex h-6 max-w-[60%] items-center justify-center rounded-md bg-white border border-gray-200 px-3 text-[10px] text-gray-400 font-mono truncate">
            salesblitz.ai/runs/4f8a...
          </div>
        </div>

        {/* App content */}
        <div className="bg-gray-50 p-6">
          {/* Status header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Prospect Prep: Snowflake</h3>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Delivered
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-gray-500">
                Sarah Chen, VP of Sales Enablement &bull; 4 min ago
              </p>
            </div>
          </div>

          {/* Asset cards grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Research Brief */}
            <div className="group rounded-lg border border-gray-200 bg-white p-3 transition hover:border-emerald-200 hover:shadow-sm">
              <div className="flex h-20 items-center justify-center rounded-md bg-gradient-to-br from-red-50 to-red-100 mb-2">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-[11px] font-semibold text-gray-900 leading-tight">Research Brief</p>
              <p className="text-[10px] text-gray-400 mt-0.5">PDF &bull; 12 pages</p>
            </div>

            {/* POV Deck */}
            <div className="group rounded-lg border border-gray-200 bg-white p-3 transition hover:border-emerald-200 hover:shadow-sm">
              <div className="flex h-20 items-center justify-center rounded-md bg-gradient-to-br from-emerald-50 to-emerald-100 mb-2">
                <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                </svg>
              </div>
              <p className="text-[11px] font-semibold text-gray-900 leading-tight">Call Playbook</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Interactive HTML</p>
            </div>

            {/* Stakeholder Map */}
            <div className="group rounded-lg border border-gray-200 bg-white p-3 transition hover:border-emerald-200 hover:shadow-sm">
              <div className="flex h-20 items-center justify-center rounded-md bg-gradient-to-br from-green-50 to-green-100 mb-2">
                <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <p className="text-[11px] font-semibold text-gray-900 leading-tight">Stakeholder Map</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Interactive HTML</p>
            </div>

            {/* Notebook Card */}
            <div className="group rounded-lg border border-gray-200 bg-white p-3 transition hover:border-emerald-200 hover:shadow-sm">
              <div className="flex h-20 items-center justify-center rounded-md bg-gradient-to-br from-amber-50 to-amber-100 mb-2">
                <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </div>
              <p className="text-[11px] font-semibold text-gray-900 leading-tight">Notebook Card</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Handwritten PNG</p>
            </div>
          </div>

          {/* Subtle "more assets" indicator */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            <span className="ml-1 text-[10px] text-gray-400">+ Call Prep Sheet, Competitive Playbook</span>
          </div>
        </div>
      </div>

      {/* Floating accent elements */}
      <div className="absolute -bottom-3 -right-3 h-24 w-24 rounded-2xl bg-gradient-to-br from-emerald-100 to-green-100 -z-10 blur-sm" />
      <div className="absolute -top-3 -left-3 h-16 w-16 rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 -z-10 blur-sm" />
    </div>
  );
}
