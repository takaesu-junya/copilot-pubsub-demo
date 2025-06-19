const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require('@aws-sdk/client-sqs');

const region = process.env.AWS_REGION || 'us-west-2';
const client = new SQSClient({ region });
const queueUrl = process.env.COPILOT_QUEUE_URI;

console.log(`Worker service starting...`);
console.log(`SQS Queue URL: ${queueUrl || 'Not configured'}`);

if (!queueUrl) {
  console.error('Error: COPILOT_QUEUE_URI environment variable is not set');
  process.exit(1);
}

async function pollMessages() {
  try {
    console.log('Polling for messages...');

    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 10, // ロングポーリング
    });

    const response = await client.send(command);

    if (response.Messages && response.Messages.length > 0) {
      for (const message of response.Messages) {
        try {
          console.log('Received message:');
          console.log(`MessageId: ${message.MessageId}`);
          console.log(`Body: ${message.Body}`);

          // メッセージの内容を解析
          const body = JSON.parse(message.Body);
          if (body.Message) {
            const messageContent = JSON.parse(body.Message);
            console.log('Processed message content:', messageContent);
          }

          // メッセージを処理した後、削除
          const deleteCommand = new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          });

          await client.send(deleteCommand);
          console.log(`Message ${message.MessageId} processed and deleted`);
        } catch (err) {
          console.error('Error processing message:', err);
        }
      }
    } else {
      console.log('No messages received');
    }
  } catch (error) {
    console.error('Error polling messages:', error);
  }

  // 次のポーリングをスケジュール
  setTimeout(pollMessages, 5000);
}

// メッセージポーリングを開始
pollMessages();
