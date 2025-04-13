// server.ts
import http from 'http';
import { agent } from './snakAgent';

// Define the interface for wallet details
interface WalletDetails {
  address: string;
  type: string;
  name: string;
  chainId: number | null;
  balance: string;
}

// Define interfaces for wallet actions
interface WalletAction {
  type: 'transaction' | 'call' | 'sign';
  details: TransactionDetails | CallDetails | SignDetails;
}

interface TransactionDetails {
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
}

interface CallDetails {
  contract: string;
  method: string;
  args: any[];
}

interface SignDetails {
  message: string;
}

// Helper function to process the prompt via your agent
async function handleUserPrompt(prompt: string, walletDetails?: WalletDetails): Promise<string> {
  console.log('Received wallet details:', walletDetails);
  console.log('Received prompt:', prompt);
  return await agent.handleInput(prompt, walletDetails);
}

// Create the Node.js HTTP server
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/ask') {
    try {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          console.log('Received request body:', body);
          const data = JSON.parse(body);
          
          if (!data.prompt) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Prompt is required' }));
            return;
          }

          // Check if wallet details are provided
          let walletDetails: WalletDetails | undefined = undefined;
          
          if (data.walletDetails) {
            console.log('Wallet details received:', data.walletDetails);
            walletDetails = data.walletDetails;
          } else {
            console.log('No wallet details provided');
          }

          console.log('Processing prompt:', data.prompt);
          // Pass wallet details to the agent if available
          const response = await agent.handleInput(data.prompt, walletDetails);
          console.log('Sending response:', response);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            response,
            walletReceived: !!walletDetails
          }));
        } catch (error) {
          console.error('Error processing request:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      });
    } catch (error) {
      console.error('Server error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  } else if (req.method === 'POST' && req.url === '/wallet-action') {
    try {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          console.log('Received wallet action request body:', body);
          const data = JSON.parse(body);
          
          if (!data.action || !data.walletDetails) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Action and wallet details are required' }));
            return;
          }

          // This endpoint doesn't actually execute the action - it returns information
          // that the frontend would use to prompt the user for confirmation
          console.log('Received wallet action request:', data.action);
          console.log('For wallet:', data.walletDetails);
          
          // In a production system, this might interact with blockchain directly
          // or return signed transaction data to be broadcast by the frontend
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'prepared',
            message: `Wallet action ${data.action.type} prepared for confirmation`,
            action: data.action,
            // In a real implementation, you might return transaction data here
            txData: {
              // Example data - would be different based on the action type
              unsignedTx: "0x...",
              estimatedGas: "100000",
              estimatedCost: "0.005 ETH"
            }
          }));
        } catch (error) {
          console.error('Error processing wallet action request:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      });
    } catch (error) {
      console.error('Server error on wallet action endpoint:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start the server on port 3001 (or any free port)
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/ask`);
  console.log(`Wallet action endpoint: http://localhost:${PORT}/wallet-action`);
});
