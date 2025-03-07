import React, { useState } from 'react';
import { 
  useGetTelegramChatsQuery, 
  useGetUserSavedChatsQuery,
  useSaveUserChatsMutation,
  useUpdateTelegramApiLinkMutation,
  useCheckTelegramApiHealthQuery,
  TelegramChat
} from '../generated';

export const TelegramChatsManager: React.FC = () => {
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [apiLink, setApiLink] = useState('');

  // Queries
  const { 
    data: telegramChats, 
    loading: loadingTelegram,
    error: telegramError 
  } = useGetTelegramChatsQuery();

  const {
    data: savedChats,
    loading: loadingSaved,
    refetch: refetchSavedChats
  } = useGetUserSavedChatsQuery();

  const { 
    data: healthCheck 
  } = useCheckTelegramApiHealthQuery({
    pollInterval: 30000 // Check health every 30 seconds
  });

  // Mutations
  const [saveChats, { loading: savingChats }] = useSaveUserChatsMutation({
    onCompleted: () => {
      refetchSavedChats();
      setSelectedChats([]);
    }
  });

  const [updateApiLink, { loading: updatingLink }] = useUpdateTelegramApiLinkMutation({
    onCompleted: () => {
      refetchSavedChats();
    }
  });

  // Handle API link update
  const handleApiLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateApiLink({
        variables: {
          apiLink
        }
      });
    } catch (error) {
      console.error('Failed to update API link:', error);
    }
  };

  // Handle chat selection
  const handleChatSelect = (chatId: string) => {
    setSelectedChats(prev => 
      prev.includes(chatId) 
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  // Handle saving selected chats
  const handleSaveChats = async () => {
    try {
      await saveChats({
        variables: {
          input: {
            chatIds: selectedChats
          }
        }
      });
    } catch (error) {
      console.error('Failed to save chats:', error);
    }
  };

  if (loadingTelegram || loadingSaved) {
    return <div>Loading...</div>;
  }

  if (telegramError) {
    return <div>Error: {telegramError.message}</div>;
  }

  return (
    <div className="p-4">
      {/* API Health Status */}
      <div className="mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full ${
          healthCheck?.checkTelegramApiHealth.status === 'healthy' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          API Status: {healthCheck?.checkTelegramApiHealth.status}
        </div>
      </div>

      {/* API Link Form */}
      <form onSubmit={handleApiLinkSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={apiLink}
            onChange={(e) => setApiLink(e.target.value)}
            placeholder="Enter Telegram API Link"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            type="submit"
            disabled={updatingLink}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {updatingLink ? 'Updating...' : 'Update API Link'}
          </button>
        </div>
      </form>

      {/* Available Telegram Chats */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-3">Available Telegram Chats</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {telegramChats?.getTelegramChats.chats.map((chat) => (
            <div 
              key={chat.id}
              className={`p-4 border rounded cursor-pointer ${
                selectedChats.includes(chat.id) ? 'border-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => handleChatSelect(chat.id)}
            >
              {chat.photoUrl && (
                <img 
                  src={chat.photoUrl} 
                  alt={chat.name}
                  className="w-12 h-12 rounded-full mb-2"
                />
              )}
              <h3 className="font-semibold">{chat.name}</h3>
              <p className="text-sm text-gray-600">{chat.type}</p>
            </div>
          ))}
        </div>
        
        {selectedChats.length > 0 && (
          <button
            onClick={handleSaveChats}
            disabled={savingChats}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-green-300"
          >
            {savingChats ? 'Saving...' : `Save Selected Chats (${selectedChats.length})`}
          </button>
        )}
      </div>

      {/* Saved Chats */}
      <div>
        <h2 className="text-xl font-bold mb-3">Saved Chats</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedChats?.getUserSavedChats.chats.map((chat) => (
            <div key={chat.id} className="p-4 border rounded">
              {chat.photoUrl && (
                <img 
                  src={chat.photoUrl} 
                  alt={chat.name}
                  className="w-12 h-12 rounded-full mb-2"
                />
              )}
              <h3 className="font-semibold">{chat.name}</h3>
              <p className="text-sm text-gray-600">{chat.type}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 