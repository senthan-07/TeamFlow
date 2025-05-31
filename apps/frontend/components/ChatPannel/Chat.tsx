import { useSocket } from '../../hooks/useSocket'; // Adjust path accordingly
import { Chat } from '../../types/type';
import { useState, useEffect, useRef } from 'react';

interface Props {
  boardId: string;
}

export default function ChatSection({ boardId }: Props) {
  const [messages, setMessages] = useState<Chat[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { socket, connected } = useSocket<Chat[]>({
    namespace: 'chat',
    boardId,
    onConnect: (socket) => {
      socket.on('initialMessages', (msgs: Chat[]) => setMessages(msgs));
      socket.on('chatMessage', (msg: Chat) => setMessages((prev) => [...prev, msg]));
    },
    onDisconnect: () => {
      console.log('Chat socket disconnected');
    },
    onError: (err) => {
      console.error('Chat socket error:', err);
    },
  });

  const sendMessage = (message: string) => {
    if (!socket || !connected || !message.trim()) return;
    socket.emit('chatMessage', { boardId, message });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!connected) {
    return <div className="p-4 text-gray-500">🔄 Connecting to chat...</div>;
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Chat</h2>
      <div className="max-h-64 overflow-y-auto space-y-2 mb-3 border p-2 rounded">
        {messages.map((msg, i) => (
          <div key={i} className="text-sm">
            <span className="font-semibold">{msg.user.name}:</span> {msg.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={sendMessage} />
    </div>
  );
}

function MessageInput({ onSend }: { onSend: (msg: string) => void }) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="flex gap-2">
      <input
        className="flex-1 border rounded p-2"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={handleSend} className="bg-blue-600 text-white px-4 py-2 rounded">
        Send
      </button>
    </div>
  );
}

