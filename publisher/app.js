const express = require('express');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const region = process.env.AWS_REGION || 'us-west-2';
const client = new SNSClient({ region });

// 環境変数からSNSトピックARNを取得
let messagesTopic;
try {
  const topicArns = JSON.parse(process.env.COPILOT_SNS_TOPIC_ARNS || '{}');
  messagesTopic = topicArns.messagesTopic;
} catch (error) {
  console.error('Error parsing SNS topic ARNs:', error);
}

// ルートエンドポイント
app.get('/', (req, res) => {
  res.send('Publisher Service is running');
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// メッセージ送信エンドポイント
app.post('/publish', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).send('Message is required');
  }

  if (!messagesTopic) {
    return res.status(500).send('SNS Topic ARN not configured');
  }

  try {
    const command = new PublishCommand({
      Message: JSON.stringify({
        text: message,
        timestamp: new Date().toISOString(),
      }),
      TopicArn: messagesTopic,
    });

    const result = await client.send(command);
    console.log('Message published:', result);

    res.status(200).json({
      success: true,
      messageId: result.MessageId,
    });
  } catch (error) {
    console.error('Failed to publish message:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Publisher service listening on port ${port}`);
  console.log(`SNS Topic ARN: ${messagesTopic || 'Not configured'}`);
});
