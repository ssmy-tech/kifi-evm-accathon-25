import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const api = axios.create({
  baseURL: `http://localhost:${process.env.PORT || 3000}`,
  headers: {
    'Authorization': `Bearer ${process.env.JWT_SECRET}`
  }
});

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testMessageSlicing() {
  try {
    console.log('\nStarting message slice test...');

    // 1. First, get a list of chats
    const chatsResponse = await api.get('/api/telegram/chats');
    const chatId = chatsResponse.data.data[0].id;
    console.log(`Using chat ID: ${chatId}`);

    // 2. Get initial messages to find a reference point
    const initialResponse = await api.get('/api/telegram/messages', {
      params: {
        chatId,
        limit: 1
      }
    });
    const referenceMessageId = initialResponse.data.data[0].id;
    console.log(`Reference message ID: ${referenceMessageId}`);

    await delay(2000); // Wait to avoid rate limiting

    // 3. Test fetching messages before the reference
    console.log('\nTesting "before" direction...');
    const beforeResponse = await api.get('/api/telegram/messages', {
      params: {
        chatId,
        fromMessageId: referenceMessageId,
        direction: 'before',
        limit: 5
      }
    });
    console.log('Messages before reference:');
    beforeResponse.data.data.forEach((msg: any) => {
      console.log(`ID: ${msg.id}, Text: ${msg.text.substring(0, 50)}...`);
      if (msg.id >= referenceMessageId) {
        console.error('❌ Found message ID >= reference ID in "before" slice');
      }
    });

    await delay(2000);

    // 4. Test fetching messages after the reference
    console.log('\nTesting "after" direction...');
    const afterResponse = await api.get('/api/telegram/messages', {
      params: {
        chatId,
        fromMessageId: referenceMessageId,
        direction: 'after',
        limit: 5
      }
    });
    console.log('Messages after reference:');
    afterResponse.data.data.forEach((msg: any) => {
      console.log(`ID: ${msg.id}, Text: ${msg.text.substring(0, 50)}...`);
      if (msg.id <= referenceMessageId) {
        console.error('❌ Found message ID <= reference ID in "after" slice');
      }
    });

    // 5. Test empty results with very high message ID
    await delay(2000);
    console.log('\nTesting empty results with high message ID...');
    const emptyResponse = await api.get('/api/telegram/messages', {
      params: {
        chatId,
        fromMessageId: referenceMessageId + 1000000,
        direction: 'after',
        limit: 5
      }
    });
    console.log(`Empty result test returned ${emptyResponse.data.data.length} messages`);

  } catch (error: any) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

// Run the test
console.log('Message Slice Test Script');
console.log('=======================');
testMessageSlicing().then(() => {
  console.log('\nTest completed');
}); 