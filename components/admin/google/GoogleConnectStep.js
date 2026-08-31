// components/admin/google/GoogleConnectStep.js
"use client";

export default function GoogleConnectStep({
  connected,
  accounts,
  connectionInfo,
  onConnect,
  onDisconnect,
  onNext,
  connecting,
}) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
      <h3 className="text-lg font-semibold text-white">
        🔑 Connect Your Google Accounts
      </h3>
      <p className="mt-1 text-sm text-gray-400">
        Connect one or more Google accounts to browse and select your
        spreadsheets. Add multiple accounts to use keywords from different
        Google Sheets.
      </p>

      <div className="mt-6 rounded-lg border-2 border-dashed border-gray-700 bg-[#0A0E17] p-8 text-center">
        {!connected || accounts.length === 0 ? (
          <>
            {/* Google logo */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white">
              <svg viewBox="0 0 48 48" className="h-10 w-10">
                <path
                  fill="#FFC107"
                  d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                />
              </svg>
            </div>

            <p className="text-white">
              Connect your Google account to access your spreadsheets.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              We only request read access to your Drive and Sheets.
            </p>

            <button
              type="button"
              onClick={onConnect}
              disabled={connecting}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#4285F4] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#3367D6] disabled:opacity-50"
            >
              {connecting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <span className="text-base">🔵</span>
              )}
              {connecting ? "Connecting..." : "Connect to Google Drive"}
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
              <span>🔒</span>
              <span>Your data is secure. We use OAuth 2.0 authentication.</span>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <span className="text-3xl">✅</span>
            </div>
            <p className="text-lg font-semibold text-white">
              {accounts.length} Google account{accounts.length !== 1 ? "s" : ""}{" "}
              connected
            </p>
            <p className="mt-1 text-sm text-gray-400">
              📊 Drive Access: Read/Write
            </p>

            {/* List of connected accounts */}
            <div className="mt-4 space-y-2 text-left">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6C63FF]/20 text-sm font-bold text-[#6C63FF]">
                      {acc.email?.charAt(0)?.toUpperCase() || "G"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {acc.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {acc.name || "Google Account"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDisconnect(acc.id)}
                    className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>

            {/* Add another account */}
            <button
              type="button"
              onClick={onConnect}
              disabled={connecting}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#4285F4] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#3367D6] disabled:opacity-50"
            >
              {connecting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <span className="text-base">➕</span>
              )}
              {connecting ? "Connecting..." : "Add Another Google Account"}
            </button>
          </>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-[#6C63FF] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#5A52E0]"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
