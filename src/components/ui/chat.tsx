 function ChatApp() {
  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-100">

      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between bg-white border-b">
        <h1 className="font-semibold text-lg">Chatterbox</h1>
        <span className="text-sm text-zinc-500">Username</span>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2">
        <div className="max-w-xs px-3 py-2 rounded-lg bg-white">
          Hello 👋
        </div>

        <div className="max-w-xs px-3 py-2 rounded-lg bg-blue-500 text-white ml-auto">
          Hi there!
        </div>
      </div>

      {/* Input */}
      <div className="h-14 px-4 flex items-center gap-2 bg-white border-t">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border rounded-md outline-none"
        />
        <button className="px-4 py-2 bg-blue-500 text-white rounded-md">
          Send
        </button>
      </div>

    </div>
  );
}

export {ChatApp}