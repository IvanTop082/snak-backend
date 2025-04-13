// snakAgent.ts

// Import the OpenAI SDK and dotenv for environment variables
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Account, RpcProvider, Contract } from 'starknet';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { ethers } from 'ethers';

// Load environment variables from a .env file
dotenv.config();

interface AgentConfig {
  aiProviderApiKey: string;
  aiProvider: string;
  aiModel: string;
  accountPrivateKey: string;
  rpcUrl: string;
}

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

// Define the result of a wallet action proposal
interface WalletActionProposal {
  action: WalletAction;
  explanation: string;
  risk: 'low' | 'medium' | 'high';
}

export class SnakAgent {
  private openai: OpenAI;
  private provider: ethers.JsonRpcProvider | null = null;

  constructor() {
    const apiKey = process.env.AI_PROVIDER_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set in environment variables');
      throw new Error('OPENAI_API_KEY is required');
    }
    console.log('Initializing OpenAI with API key:', apiKey.substring(0, 5) + '...');
    this.openai = new OpenAI({
      apiKey: apiKey
    });

    // Initialize ethers provider if RPC URL is available
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    if (rpcUrl) {
      try {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        console.log('Initialized Ethereum provider with RPC URL');
      } catch (error) {
        console.error('Failed to initialize Ethereum provider:', error);
      }
    }
  }

  /**
   * Processes the prompt by calling OpenAI.
   * This method sends the prompt to OpenAI and returns its response text.
   * Now accepts optional wallet details to enhance the prompt with user's blockchain context.
   */
  async handleInput(prompt: string, walletDetails?: WalletDetails): Promise<string> {
    try {
      console.log('Processing prompt:', prompt);
      
      // If wallet details are provided, include them in the context
      const messages: ChatCompletionMessageParam[] = [];
      
      if (walletDetails) {
        console.log('Including wallet details in prompt:', {
          address: walletDetails.address,
          type: walletDetails.type,
          name: walletDetails.name,
          chainId: walletDetails.chainId,
          balance: walletDetails.balance
        });
        
        // Check if the prompt is requesting wallet actions
        const isWalletActionRequest = this.isWalletActionRequest(prompt);
        
        // Add system message with wallet context
        messages.push({
          role: "system", 
          content: `You are assisting a user with the following wallet details:
            - Wallet Address: ${walletDetails.address}
            - Wallet Type: ${walletDetails.type}
            - Wallet Name: ${walletDetails.name}
            - Chain ID: ${walletDetails.chainId || 'Unknown'}
            - Balance: ${walletDetails.balance}
            
            Provide tailored crypto/blockchain advice based on these details when relevant.
            ${isWalletActionRequest ? 'The user appears to be asking for a wallet action. If appropriate, you may suggest a specific action using the propose_wallet_action function.' : ''}`
        });
      }
      
      // Add the user's prompt
      messages.push({ role: "user", content: prompt });
      
      const functions = [
        {
          name: "propose_wallet_action",
          description: "Propose a wallet action such as a transaction or contract call when the user explicitly requests it",
          parameters: {
            type: "object",
            properties: {
              action: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["transaction", "call", "sign"],
                    description: "The type of wallet action to perform"
                  },
                  details: {
                    type: "object",
                    description: "The details of the wallet action"
                  }
                },
                required: ["type", "details"]
              },
              explanation: {
                type: "string",
                description: "A clear explanation of what this wallet action will do and why it's being proposed"
              },
              risk: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "The risk level associated with this action"
              }
            },
            required: ["action", "explanation", "risk"]
          }
        }
      ];
      
      const completion = await this.openai.chat.completions.create({
        messages: messages.length > 0 ? messages : [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
        functions: walletDetails ? functions : undefined,
        function_call: "auto"
      });
      
      const responseMessage = completion.choices[0].message;
      
      // Check if a function was called
      if (responseMessage.function_call && responseMessage.function_call.name === "propose_wallet_action") {
        try {
          const functionArgs = JSON.parse(responseMessage.function_call.arguments);
          const actionProposal: WalletActionProposal = functionArgs;
          
          // Format the wallet action proposal as a user-friendly message
          return this.formatWalletActionProposal(actionProposal);
        } catch (error) {
          console.error('Error parsing function arguments:', error);
          return responseMessage.content || "I suggested a wallet action but encountered an error processing it. Please try again with a more specific request.";
        }
      }
      
      const response = responseMessage.content || "No response generated";
      console.log('Generated response:', response);
      return response;
    } catch (error) {
      console.error('Detailed error in handleInput:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  /**
   * Checks if the prompt appears to be requesting a wallet action
   */
  private isWalletActionRequest(prompt: string): boolean {
    const walletActionKeywords = [
      'send', 'transfer', 'transaction', 'sign', 'approve', 'swap', 'exchange',
      'buy', 'sell', 'trade', 'stake', 'unstake', 'delegate', 'vote', 'claim',
      'withdraw', 'deposit', 'bridge', 'connect', 'mint', 'burn', 'call contract'
    ];
    
    const lowercasePrompt = prompt.toLowerCase();
    return walletActionKeywords.some(keyword => lowercasePrompt.includes(keyword));
  }

  /**
   * Formats a wallet action proposal into a user-friendly message
   */
  private formatWalletActionProposal(proposal: WalletActionProposal): string {
    // Get risk level emoji
    const riskEmoji = proposal.risk === 'low' ? '🟢' : 
                     proposal.risk === 'medium' ? '🟠' : '🔴';
    
    // Format the action details based on the action type
    let actionDetails = '';
    if (proposal.action.type === 'transaction') {
      const txDetails = proposal.action.details as TransactionDetails;
      actionDetails = `
To: ${txDetails.to}
${txDetails.value ? `Value: ${txDetails.value} ETH` : ''}
${txDetails.data ? `Data: ${txDetails.data}` : ''}
${txDetails.gasLimit ? `Gas Limit: ${txDetails.gasLimit}` : ''}`;
    } else if (proposal.action.type === 'call') {
      const callDetails = proposal.action.details as CallDetails;
      actionDetails = `
Contract: ${callDetails.contract}
Method: ${callDetails.method}
Arguments: ${JSON.stringify(callDetails.args, null, 2)}`;
    } else if (proposal.action.type === 'sign') {
      const signDetails = proposal.action.details as SignDetails;
      actionDetails = `
Message to sign: ${signDetails.message}`;
    }
    
    // Format the complete message
    return `
## Wallet Action Proposed

I suggest the following wallet action:

**Action Type**: ${proposal.action.type.toUpperCase()}

**Details**: ${actionDetails}

**Explanation**: ${proposal.explanation}

**Risk Level**: ${riskEmoji} ${proposal.risk.toUpperCase()}

To proceed with this action, you would need to confirm it through your wallet. This is just a suggestion based on your request.
`;
  }

  /**
   * Executes a wallet action if provided with appropriate credentials
   * Note: This would require integration with the frontend's wallet connection
   */
  async executeWalletAction(action: WalletAction, walletDetails: WalletDetails): Promise<string> {
    // This is a placeholder method - actual implementation would require frontend integration
    // In a real implementation, this would call back to the frontend to request wallet signature
    
    return `Simulated executing ${action.type} action for wallet ${walletDetails.address}`;
  }
}

// Create and export a default instance
const config: AgentConfig = {
  aiProviderApiKey: process.env.AI_PROVIDER_API_KEY || "your-ai-provider-key",
  aiProvider: "openai",
  aiModel: "gpt-3.5-turbo",
  accountPrivateKey: process.env.STARKNET_PRIVATE_KEY || "your-wallet-private-key",
  rpcUrl: process.env.STARKNET_RPC_URL || "your-starknet-rpc-url",
};

export const agent = new SnakAgent();
