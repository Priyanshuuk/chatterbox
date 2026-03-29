function ChatApp() {
  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-100 dark:bg-zinc-950">

      {/* Header */}
      <div className="h-14 px-5 flex items-center justify-between bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h1 className="font-semibold text-lg tracking-tight">Chatterbox</h1>
        <span className="text-sm text-zinc-500">Username</span>
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 py-6 overflow-y-auto space-y-3">
        
        {/* Incoming */}
        <div className="max-w-xs px-4 py-2 rounded-2xl rounded-tl-sm bg-white dark:bg-zinc-800 text-sm shadow">
          Hello 👋
        </div>

        {/* Outgoing */}
        <div className="max-w-xs px-4 py-2 rounded-2xl rounded-tr-sm bg-blue-500 text-white text-sm ml-auto shadow">
          Hi there!
        </div>

      </div>

      {/* Input */}
      <div className="h-16 px-4 flex items-center gap-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-full outline-none bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500"
        />
        <button className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-full transition">
          Send
        </button>
      </div>

    </div>
  );
}

export { ChatApp };
