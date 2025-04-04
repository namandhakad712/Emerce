import { GoogleGenerativeAI, GenerativeModel, GenerationConfig, Content, Part } from '@google/generative-ai';
import * as supabaseService from './supabase';

interface Message {
  role: string;
  content: string;
  timestamp?: number;
  id?: string;
}

// Type for multimodal content
interface ContentPart {
  text?: string;
  image_url?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
}

// Define model interface
export interface GeminiModel {
  id: string;
  name: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
  multimodal?: boolean;
  apiVersion?: string; // Add API version tracking
}

// Initialize the Gemini API with the API key
const API_KEY = 'AIzaSyC81EywHHPaslM_nTBEyBO-FWaXLc-tXvc';
const genAI = new GoogleGenerativeAI(API_KEY);

// Available models - will be updated dynamically 
export let AVAILABLE_MODELS: GeminiModel[] = [
  { id: 'gemini-pro', name: 'Gemini Pro', apiVersion: 'v1', multimodal: false },
  { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', apiVersion: 'v1', multimodal: true },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', apiVersion: 'v1', multimodal: true },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', apiVersion: 'v1', multimodal: false },
  { id: 'gemini-1.5-pro-vision', name: 'Gemini 1.5 Pro Vision', apiVersion: 'v1', multimodal: true },
];

// Model to API version mapping
const MODEL_API_VERSIONS: Record<string, string> = {
  'gemini-pro': 'v1',
  'gemini-pro-vision': 'v1',
  'gemini-1.5-pro': 'v1',
  'gemini-1.5-flash': 'v1',
  'gemini-2.0-flash': 'v1beta',
  'gemini-2.0-pro': 'v1beta',
  'gemini-2.0-flash-exp-image-generation': 'v1beta'
};

// Get the API version for a given model ID
const getApiVersion = (modelId: string): string => {
  return MODEL_API_VERSIONS[modelId] || 'v1'; // Default to v1 if unknown
};

// Default generation config
const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
};

// Sort models by capability and version
export const sortModels = (models: GeminiModel[]): GeminiModel[] => {
  return [...models].sort((a, b) => {
    // First sort by generation (2.0, 1.5, 1.0)
    const versionA = a.id.match(/(\d+\.\d+)/)?.[1] || '0.0';
    const versionB = b.id.match(/(\d+\.\d+)/)?.[1] || '0.0';
    
    if (versionA !== versionB) {
      return parseFloat(versionB) - parseFloat(versionA);
    }
    
    // Then sort by capability (pro before flash)
    if (a.id.includes('pro') && !b.id.includes('pro')) return -1;
    if (!a.id.includes('pro') && b.id.includes('pro')) return 1;
    
    // Then by multimodal capability (multimodal first)
    if (a.multimodal && !b.multimodal) return -1;
    if (!a.multimodal && b.multimodal) return 1;
    
    // Then alphabetically
    return a.id.localeCompare(b.id);
  });
};

// Get a human-readable model description
export const getModelDescription = (model: GeminiModel): string => {
  if (model.description) {
    // Limit description length
    return model.description.length > 120 
      ? model.description.substring(0, 120) + '...' 
      : model.description;
  }
  
  // Generate a description based on model properties if no description available
  const capabilities = [];
  
  // Add generation info
  const versionMatch = model.id.match(/(\d+\.\d+)/);
  const generation = versionMatch ? versionMatch[1] : '';
  
  if (generation) {
    capabilities.push(`Gemini ${generation} generation`);
  }
  
  // Add capability info
  if (model.id.includes('pro')) {
    capabilities.push('Pro capabilities');
  } else if (model.id.includes('flash')) {
    capabilities.push('Fast response');
  }
  
  // Add multimodal info
  if (model.multimodal) {
    capabilities.push('Supports images');
  }
  
  // Add token info if available
  if (model.inputTokenLimit) {
    capabilities.push(`${(model.inputTokenLimit / 1000).toFixed(0)}K token limit`);
  }
  
  return capabilities.join(' • ') || 'Gemini AI model';
};

// Fetch available models using the REST API directly
export const fetchAvailableModels = async () => {
  try {
    // Try fetching models from v1 endpoint first
    const v1Models = await fetchModelsFromEndpoint('v1');
    
    // Then try v1beta models
    const v1betaModels = await fetchModelsFromEndpoint('v1beta');
    
    // Combine the results
    const allModels = [...v1Models, ...v1betaModels];
    
    if (allModels.length > 0) {
      console.log('Combined available models:', allModels);
      AVAILABLE_MODELS = sortModels(allModels);
    }
    
    return AVAILABLE_MODELS;
  } catch (error) {
    console.error('Error fetching available models:', error);
    
    // Use default models as fallback, but make sure they're sorted
    return sortModels(AVAILABLE_MODELS);
  }
};

// Helper to fetch models from a specific endpoint version
const fetchModelsFromEndpoint = async (apiVersion: string): Promise<GeminiModel[]> => {
  try {
    console.log(`Fetching models from ${apiVersion} endpoint`);
    const response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models?key=${API_KEY}`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch models from ${apiVersion} endpoint: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`${apiVersion} models data:`, data);
    
    if (!data || !data.models || !Array.isArray(data.models)) {
      console.warn(`No models found in ${apiVersion} response`);
      return [];
    }
    
    // Process and map the models
    const availableModels = data.models
      .filter((model: any) => model.name.includes('gemini'))
      .map((model: any) => {
        // Extract the model name from the full path (models/gemini-pro)
        const modelId = model.name.split('/').pop();
        
        // Format the display name
        let displayName = modelId
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
        
        // Determine if the model is multimodal based on supported methods
        // Models that support image inputs (vision models) are multimodal
        const supportedMethods = model.supportedGenerationMethods || [];
        const isMultimodal = 
          model.name.includes('vision') || 
          supportedMethods.includes('generateContentStreaming') || 
          supportedMethods.includes('countTokensStreaming') ||
          (
            // Check if model documentation mentions images
            (model.description || '').toLowerCase().includes('image') && 
            (model.description || '').toLowerCase().includes('text')
          );
        
        console.log(`Model ${modelId} multimodal status: ${isMultimodal}`);
        
        return {
          id: modelId,
          name: displayName,
          description: model.description || '',
          inputTokenLimit: model.inputTokenLimit || 0,
          outputTokenLimit: model.outputTokenLimit || 0,
          supportedGenerationMethods: model.supportedGenerationMethods || [],
          multimodal: isMultimodal,
          apiVersion: apiVersion  // Tag with correct API version
        };
      });
    
    console.log(`Found ${availableModels.length} models in ${apiVersion} endpoint`);
    return availableModels;
  } catch (error) {
    console.error(`Error fetching models from ${apiVersion} endpoint:`, error);
    return [];
  }
};

// Generate AI response
export const generateResponse = async (
  messages: { role: string; content: string | Array<ContentPart> }[],
  modelId: string = 'gemini-pro',
  generationConfig: GenerationConfig = DEFAULT_GENERATION_CONFIG
) => {
  // Track which models we've tried to avoid infinite loops
  const triedModels = new Set<string>();
  
  // Track if we've already tried truncating the context
  let hasTriedTruncation = false;
  
  // Function to estimate token count roughly (1 token ≈ 4 chars)
  const estimateTokenCount = (messages: { role: string; content: string | Array<ContentPart> }[]): number => {
    let totalChars = 0;
    
    for (const msg of messages) {
      // Add chars for the role
      totalChars += msg.role.length;
      
      // Add chars for the content
      if (typeof msg.content === 'string') {
        totalChars += msg.content.length;
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.text) {
            totalChars += part.text.length;
          } else if (part.image_url) {
            // Images typically use around 4000-5000 tokens
            totalChars += 20000; // Rough estimate of chars equivalent for image
          } else if (part.inlineData && part.inlineData.data) {
            // Base64 images - rough estimate
            totalChars += part.inlineData.data.length;
          }
        }
      }
    }
    
    // Convert to tokens (roughly 4 characters per token)
    return Math.ceil(totalChars / 4);
  };
  
  // Function to truncate context when it gets too large
  const truncateContext = (messages: { role: string; content: string | Array<ContentPart> }[], maxTokens: number = 500000): { role: string; content: string | Array<ContentPart> }[] => {
    console.log('Truncating context to fit within token limits...');
    
    // Always keep the last message (user's current query)
    const lastMessage = messages[messages.length - 1];
    
    // Initialize with just the last message
    const truncatedMessages: typeof messages = [lastMessage];
    let estimatedTokens = estimateTokenCount([lastMessage]);
    const tokenBuffer = 50000; // Buffer to ensure we stay under limits
    
    // Try to add as many recent messages as possible within the token budget
    // Start from the second-to-last message and work backwards
    for (let i = messages.length - 2; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = estimateTokenCount([message]);
      
      // If adding this message would exceed our limit, stop adding messages
      if (estimatedTokens + messageTokens + tokenBuffer > maxTokens) {
        console.log(`Truncation stopped at message ${i+1}/${messages.length}, estimated tokens: ${estimatedTokens}`);
        break;
      }
      
      // Add this message to the beginning of our truncated list
      truncatedMessages.unshift(message);
      estimatedTokens += messageTokens;
    }
    
    // If we have truncated messages, add a system message to inform that history was truncated
    if (truncatedMessages.length < messages.length) {
      const remainingCount = messages.length - truncatedMessages.length;
      console.log(`Truncated ${remainingCount} older messages to fit token limits`);
      
      // Only add the system message if we're truncating a significant portion
      if (remainingCount > 2) {
        const systemMsg = {
          role: 'system',
          content: `Note: ${remainingCount} earlier messages were removed to fit token limits. The conversation continues from here.`
        };
        truncatedMessages.unshift(systemMsg);
      }
    }
    
    return truncatedMessages;
  };
  
  // Function to attempt generation with fallbacks
  const attemptGeneration = async (currentModelId: string, currentMessages: { role: string; content: string | Array<ContentPart> }[] = messages): Promise<any> => {
    try {
      triedModels.add(currentModelId); // Mark this model as tried
      
      // Check estimated token count
      const estimatedTokens = estimateTokenCount(currentMessages);
      console.log(`Estimated token count for request: ${estimatedTokens}`);
      
      // Pre-emptively truncate if we're likely to exceed limits
      if (estimatedTokens > 900000 && !hasTriedTruncation) {
        console.log('Preemptively truncating context - token count too high');
        hasTriedTruncation = true;
        const truncatedMessages = truncateContext(currentMessages);
        console.log(`Truncated from ${currentMessages.length} to ${truncatedMessages.length} messages`);
        return attemptGeneration(currentModelId, truncatedMessages);
      }
      
      // Get the last user message
      const lastMessage = currentMessages[currentMessages.length - 1];
      
      // Check if message contains images
      const isMultimodal = Array.isArray(lastMessage.content) && 
                          lastMessage.content.some(part => 
                            part.image_url || 
                            (part as any).inlineData || 
                            (part as any).inline_data
                          );
      
      // Always use vision model for images
      const useModel = isMultimodal ? 'gemini-pro-vision' : currentModelId;
      console.log(`Using model: ${useModel} (original: ${currentModelId}, is multimodal: ${isMultimodal})`);
      
      // Get the API version for this model
      const apiVersion = getApiVersion(useModel);
      console.log(`Using API version: ${apiVersion} for model: ${useModel}`);
      
      // For multimodal (image) messages - use a direct approach
      if (isMultimodal && Array.isArray(lastMessage.content)) {
        console.log('Processing image content with direct API call');
        
        // Extract all parts (both text and images)
        const multimodalParts = [];
        let imageCount = 0;
        
        for (const part of lastMessage.content) {
          if (part.text) {
            multimodalParts.push({ text: part.text });
          } else if (part.inlineData && part.inlineData.data) {
            // Direct inline data (already formatted correctly)
            multimodalParts.push({
              inlineData: {
                mimeType: part.inlineData.mimeType || 'image/jpeg',
                data: part.inlineData.data
              }
            });
            imageCount++;
          } else if (part.image_url && part.image_url.startsWith('data:')) {
            // Parse data URL
            const [header, base64Data] = part.image_url.split(',');
            if (base64Data) {
              const mimeMatch = header.match(/data:(.*?);/);
              const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
              
              multimodalParts.push({
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              });
              imageCount++;
            }
          }
        }
        
        console.log(`Prepared ${multimodalParts.length} parts (${imageCount} images)`);
        
        try {
          // Get correct API version for vision model
          const visionApiVersion = getApiVersion('gemini-pro-vision');
          
          // Make direct API call with correct API version
          const response = await fetch(
            `https://generativelanguage.googleapis.com/${visionApiVersion}/models/gemini-pro-vision:generateContent?key=${API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: multimodalParts
                }],
                generationConfig: {
                  temperature: generationConfig.temperature || 0.7,
                  maxOutputTokens: generationConfig.maxOutputTokens || 2048,
                  topK: generationConfig.topK || 40,
                  topP: generationConfig.topP || 0.95
                }
              })
            }
          );
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`API error: ${response.status} - ${errorText}`);
            
            // If this is a rate limit error (429), try a different model
            if (response.status === 429) {
              throw new Error(`RATE_LIMIT:${errorText}`);
            }
            
            throw new Error(`API request failed: ${errorText}`);
          }
          
          const data = await response.json();
          const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                            'Sorry, I could not analyze that image. Please try again.';
          
          return { content: textContent };
        } catch (error) {
          console.error('Error with direct image API call:', error);
          
          // If rate limit hit, try fallback model
          if (error instanceof Error && error.message.startsWith('RATE_LIMIT:')) {
            console.log('Rate limit hit, trying fallback model for image processing');
            // For images, we can only use vision models
            const fallbackVisionModel = 'gemini-1.5-pro-vision';
            
            if (!triedModels.has(fallbackVisionModel)) {
              console.log(`Trying fallback vision model: ${fallbackVisionModel}`);
              return attemptGeneration(fallbackVisionModel, currentMessages);
            }
          }
          
          // User-friendly error messages based on error type
          if (error instanceof Error) {
            if (error.message.includes('INVALID_ARGUMENT')) {
              return {
                content: "I'm sorry, I can't analyze this image. The image may be in an unsupported format or contain content I can't process."
              };
            }
            
            if (error.message.includes('PERMISSION_DENIED') || 
                error.message.includes('CONTENT_POLICY')) {
              return {
                content: "I'm sorry, I can't analyze this image due to content policy restrictions."
              };
            }
            
            if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('quota')) {
              return {
                content: "I'm sorry, I've reached my processing limits. Please try again in a moment or with a simpler request."
              };
            }
          }
          
          return {
            content: "I'm unable to analyze this image. There was a problem processing it."
          };
        }
      }
      
      // For text-only messages, use the standard approach with correct API version
      const model = genAI.getGenerativeModel({ 
        model: useModel,
        generationConfig
      });
      
      // Get content for regular messages
      const messageText = typeof lastMessage.content === 'string' 
        ? lastMessage.content 
        : JSON.stringify(lastMessage.content);
      
      // Generate content
      try {
        const result = await model.generateContent(messageText);
        const response = await result.response;
        return { content: response.text() };
      } catch (error) {
        console.error(`Error using SDK for model ${useModel}:`, error);
        
        // Handle token limit errors
        if (error instanceof Error && 
            error.message.includes('token') && 
            error.message.includes('exceeds')) {
          
          console.log('Token limit exceeded, trying to truncate context');
          
          // Only try truncation once to avoid infinite loops
          if (!hasTriedTruncation) {
            hasTriedTruncation = true;
            const truncatedMessages = truncateContext(currentMessages);
            console.log(`Truncated from ${currentMessages.length} to ${truncatedMessages.length} messages`);
            
            // If truncation didn't reduce the message count enough, tell the user
            if (truncatedMessages.length > currentMessages.length - 3) {
              return {
                content: "This conversation has grown too large for the AI to process. Please start a new chat or simplify your current question."
              };
            }
            
            // Try again with truncated context
            return attemptGeneration(currentModelId, truncatedMessages);
          } else {
            // If we've already tried truncation, return a helpful message
            return {
              content: "This message is too large for me to process. Please try breaking it into smaller parts or starting a new conversation."
            };
          }
        }
        
        // If we get a 404 model not found error, try direct API call with correct version
        if (error instanceof Error && 
           (error.message.includes('not found') || 
            error.message.includes('404'))) {
          
          console.log(`Trying direct API call for model ${useModel} with version ${apiVersion}`);
          
          const response = await fetch(
            `https://generativelanguage.googleapis.com/${apiVersion}/models/${useModel}:generateContent?key=${API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [{ text: messageText }]
                }],
                generationConfig: {
                  temperature: generationConfig.temperature || 0.7,
                  maxOutputTokens: generationConfig.maxOutputTokens || 2048,
                  topK: generationConfig.topK || 40,
                  topP: generationConfig.topP || 0.95
                }
              })
            }
          );
          
          if (!response.ok) {
            throw new Error(`Direct API call failed: ${response.status}`);
          }
          
          const data = await response.json();
          const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                            'Sorry, I could not generate a response. Please try again.';
          
          return { content: textContent };
        }
        
        // If not a 404, rethrow the error
        throw error;
      }
      
    } catch (error) {
      console.error(`Error using model ${currentModelId}:`, error);
      
      // Handle token limit errors at the outer level
      if (error instanceof Error && 
          error.message.includes('token') && 
          error.message.includes('exceeds') && 
          !hasTriedTruncation) {
        
        console.log('Token limit exceeded in outer catch, trying to truncate context');
        hasTriedTruncation = true;
        const truncatedMessages = truncateContext(currentMessages);
        
        // Try again with truncated context
        return attemptGeneration(currentModelId, truncatedMessages);
      }
      
      // Check for rate limit errors and try fallback models
      if (error instanceof Error && 
          (error.message.includes('quota') || 
           error.message.includes('429') || 
           error.message.includes('rate limit'))) {
        
        console.log('Rate limit hit, trying fallback model');
        
        // Define fallback order
        const fallbackModels = [
          'gemini-pro',         // Most stable general model
          'gemini-1.5-flash',   // Fast alternative
          'gemini-1.5-pro',     // Capable alternative
          'gemini-pro-vision'   // Last resort for text
        ];
        
        // Find a model we haven't tried yet
        for (const fallbackModel of fallbackModels) {
          if (!triedModels.has(fallbackModel)) {
            console.log(`Trying fallback model: ${fallbackModel}`);
            return attemptGeneration(fallbackModel, currentMessages);
          }
        }
        
        // If we've tried all fallbacks, return a quota error message
        return {
          content: "I've reached my processing limits. Please try again in a minute as I'm experiencing high demand right now."
        };
      }
      
      // Check if the error is related to model not being found
      if (error instanceof Error && 
          (error.message.includes('not found') || 
           error.message.includes('404'))) {
        console.log(`Model ${currentModelId} not found. Trying fallback models.`);
        
        // Define fallback models for API version issues
        const fallbackModels = [
          'gemini-pro',
          'gemini-1.5-flash'
        ];
        
        // Try fallbacks
        for (const fallbackModel of fallbackModels) {
          if (!triedModels.has(fallbackModel)) {
            console.log(`Trying API version compatible model: ${fallbackModel}`);
            return attemptGeneration(fallbackModel, currentMessages);
          }
        }
        
        return {
          content: "I encountered an issue with the selected model. Please try a different model from the menu."
        };
      }
      
      // Error handling for other types of errors
      if (error instanceof Error) {
        if (error.message.includes('token count') && error.message.includes('exceeds')) {
          return {
            content: 'This conversation has become too long for me to process. Please start a new chat or ask a shorter question.'
          };
        }
        
        return {
          content: `I encountered an error processing your request. Please try again in a moment.`
        };
      }
      
      return {
        content: 'I encountered an error while processing your request. Please try again.'
      };
    }
  };
  
  // Start with the requested model
  return attemptGeneration(modelId);
};

/**
 * Creates a formatted response template for educational content
 * @param subject The detected subject
 * @param topic The detected topic or chapter
 * @param question The user's original question
 * @param solution The step-by-step solution
 * @param tricks Optional mnemonics, tips, or tricks
 * @returns A formatted string following the required template
 */
export const createResponseTemplate = (
  subject: string,
  topic: string,
  question: string,
  solution: string,
  tricks?: string
): string => {
  // Extract content from the solution for the brief
  const brief = solution.split('.')[0] + '.';
  
  // Format the solution to ensure it has step-wise formatting if not already
  let formattedSolution = '';
  
  if (solution.includes('Step ')) {
    // Already has steps, keep as is
    formattedSolution = solution;
    } else {
    // Split by sentences or paragraphs and format as steps
    const lines = solution
      .split(/\n|\./)
      .map(line => line.trim())
      .filter(line => line.length > 15); // Only keep substantive lines
    
    if (lines.length <= 1) {
      // If not enough substantive lines, split by punctuation or just make 3 steps
      formattedSolution = "Step 1: " + solution;
    } else {
      formattedSolution = lines
        .map((line, index) => `Step ${index + 1}: ${line}${!line.endsWith('.') ? '.' : ''}`)
        .join('\n');
    }
  }
  
  // Default trick if none provided
  const defaultTrick = `Remember to approach ${subject} problems methodically, breaking them down into smaller parts.`;
  
  // Create template with enhanced formatting WITHOUT code blocks
  const template = `*${brief}*

## **${subject}** | *${topic}*

### **Question:** 
${question}

### **Solution:** 
${formattedSolution}

### **💡 Tricks & Tips:**
${tricks || defaultTrick}`;

  return template;
};

/**
 * Detects if a query is educational in nature
 */
const detectEducationalQuery = (query: string): boolean => {
  // If query is empty, it's not educational
  if (!query) {
    return false;
  }
  
  // If query is empty or just about analyzing an image, it's not educational
  if (query.toLowerCase().includes('analyze this image') ||
      query.toLowerCase().includes('what is in this image') ||
      query.toLowerCase().includes('describe this image') ||
      query.toLowerCase().includes('can you tell me about this image')) {
    return false;
  }
  
  // More aggressive detection of educational queries
  const educationalKeywords = [
    // Question types
    'calculate', 'solve', 'explain', 'what is', 'how does', 'why does', 
    'define', 'describe', 'compare', 'contrast', 'analyze', 'evaluate',
    'find', 'compute', 'determine', 'prove', 'show', 'demonstrate',
    
    // Subjects
    'physics', 'chemistry', 'biology', 'math', 'mathematics', 'history',
    'geography', 'science', 'economics', 'psychology', 'sociology',
    'philosophy', 'engineering', 'computer science', 'programming',
    'literature', 'language', 'grammar', 'algebra', 'geometry',
    
    // Academic terms
    'formula', 'equation', 'theory', 'law', 'principle', 'concept',
    'problem', 'solution', 'homework', 'assignment', 'exam', 'test', 'quiz',
    'lecture', 'class', 'course', 'curriculum', 'textbook', 'chapter',
    'study', 'learning', 'education', 'academic', 'school', 'college', 'university',
    
    // Common educational phrases
    'help me understand', 'explain concept', 'need help with', 'struggling with',
    'how to solve', 'show steps', 'An aqueous solution', 'show solution', 'define', 'describe', 'calculate', 'find', 'solve', 'determine', 'prove', 'show', 'demonstrate', 'show working', 'step by step'
  ];
  
  // Convert query to lowercase for case-insensitive matching
  const lowerQuery = query.toLowerCase();
  
  // Always treat as educational if it has explicit markers
  if (lowerQuery.includes('template') || 
      lowerQuery.includes('format') || 
      lowerQuery.includes('subject:') || 
      lowerQuery.includes('topic:') || 
      lowerQuery.includes('question:') ||
      lowerQuery.includes('education') ||
      lowerQuery.includes('study quest') ||
      lowerQuery.includes('homework')) {
    return true;
  }
  
  // Check if the query contains any educational keywords
  const hasEducationalKeyword = educationalKeywords.some(keyword => 
    lowerQuery.includes(keyword.toLowerCase())
  );
  
  // Check if the query likely contains a study question
  const hasQuestionPattern = (
    /^(what|why|how|when|where|who|which|explain|define|describe|calculate)/i.test(lowerQuery) || // Starts with question word
    /^(find|solve|compute|determine|analyze)/i.test(lowerQuery) // Starts with instruction word
  );
  
  // Check if the query has numerical/mathematical content
  const hasMathContent = 
    /\d+\s*[\+\-\*\/\^]\s*\d+/.test(query) || // Basic arithmetic operations
    /\([^)]*\)/.test(query) || // Parentheses (common in math)
    /\d+\s*=/.test(query);     // Equation with equals sign
  
  // Look for signals that this is a casual conversation
  const isCasualConversation = 
    /^(hi|hello|hey|good morning|good afternoon|thanks|thank you|how are you|what's up)/i.test(lowerQuery) || // Greetings
    /^(can you|could you|would you|will you) (help|assist|create|make|generate|write|draft)/i.test(lowerQuery) || // Requests
    /^(tell me about|what do you think|what's your opinion|do you like)/i.test(lowerQuery) || // Opinion/info seeking
    lowerQuery.includes('chat') ||
    lowerQuery.includes('talk') ||
    lowerQuery.includes('conversation');
  
  // Detect educational queries with good accuracy
  // Must have either:
  // 1. Educational keyword AND question pattern
  // 2. Mathematical content
  // 3. Multiple educational keywords
  const matchCount = educationalKeywords.filter(keyword => 
    lowerQuery.includes(keyword.toLowerCase())
  ).length;
  
  const isEducational = (
    (hasEducationalKeyword && hasQuestionPattern) || 
    hasMathContent || 
    matchCount >= 2
  );
  
  // If it's a casual conversation, don't use educational template
  if (isCasualConversation) {
    return false;
  }
  
  return isEducational;
};

/**
 * Detects the subject and topic based on the query
 */
const detectSubjectAndTopic = (query: string): { subject: string, topic: string } => {
  // Default values
  let subject = 'General Knowledge';
  let topic = 'Conceptual Understanding';
  
  // Physics detection
  if (/physics|motion|force|energy|gravity|momentum|mechanics|electromagnet|wave|optic/i.test(query)) {
    subject = 'Physics';
    
    if (/motion|velocity|acceleration|displacement|kinematics/i.test(query)) {
      topic = 'Kinematics';
    } else if (/force|newton|law of motion/i.test(query)) {
      topic = 'Newton\'s Laws';
    } else if (/energy|work|power|conservation/i.test(query)) {
      topic = 'Work and Energy';
    } else if (/gravity|gravitational/i.test(query)) {
      topic = 'Gravitation';
    } else if (/electricity|magnetic|electromagnet/i.test(query)) {
      topic = 'Electromagnetism';
    }
  }
  
  // Chemistry detection
  else if (/chemistry|element|compound|reaction|acid|base|organic|molecule|atom|bond/i.test(query)) {
    subject = 'Chemistry';
    
    if (/periodic|element/i.test(query)) {
      topic = 'Periodic Table';
    } else if (/acid|base|ph/i.test(query)) {
      topic = 'Acid-Base Chemistry';
    } else if (/organic|carbon|hydrocarbon/i.test(query)) {
      topic = 'Organic Chemistry';
    } else if (/bond|molecule|structure/i.test(query)) {
      topic = 'Chemical Bonding';
    } else if (/reaction|equation|balance/i.test(query)) {
      topic = 'Chemical Reactions';
    }
  }
  
  // Biology detection
  else if (/biology|cell|gene|dna|evolution|ecosystem|organism|plant|animal|human/i.test(query)) {
    subject = 'Biology';
    
    if (/cell|organelle|membrane/i.test(query)) {
      topic = 'Cell Biology';
    } else if (/gene|dna|rna|genetic|heredity/i.test(query)) {
      topic = 'Genetics';
    } else if (/evolution|natural selection|adaptation/i.test(query)) {
      topic = 'Evolution';
    } else if (/ecosystem|ecology|environment/i.test(query)) {
      topic = 'Ecology';
    } else if (/human|anatomy|physiology|organ/i.test(query)) {
      topic = 'Human Biology';
    }
  }
  
  // Math detection
  else if (/math|algebra|geometry|calculus|trigonometry|equation|function|number/i.test(query)) {
    subject = 'Mathematics';
    
    if (/algebra|equation|variable|expression/i.test(query)) {
      topic = 'Algebra';
    } else if (/geometry|shape|angle|triangle|circle/i.test(query)) {
      topic = 'Geometry';
    } else if (/calculus|derivative|integral|limit/i.test(query)) {
      topic = 'Calculus';
    } else if (/trigonometry|sin|cos|tan|angle/i.test(query)) {
      topic = 'Trigonometry';
    } else if (/statistic|probability|distribution/i.test(query)) {
      topic = 'Statistics & Probability';
    }
  }
  
  return { subject, topic };
};

/**
 * Extracts the main question from the user query
 */
const extractQuestion = (query: string): string => {
  // If query ends with question mark, it's likely the whole thing is a question
  if (query.trim().endsWith('?')) {
    return query.trim();
  }
  
  // Try to identify question parts
  const questionPatterns = [
    /(?:can you|could you|please)?\s*(.+\?)/i,  // Matches anything ending with ?
    /(?:what|how|why|when|who|where|which|explain|calculate|find|solve|determine)\s+(.+)/i // Matches common question starters
  ];
  
  for (const pattern of questionPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Default to the whole query if no clear question is identified
  return query.trim();
};

// The valid categories for concept cards - matching the UI
const validCategories = ['Physics', 'Chemistry', 'Biology', 'Other'];

// Helper function to sanitize JSON strings with invalid control characters
const sanitizeJsonString = (jsonString: string): string => {
  // Replace invalid control characters
  return jsonString
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\n\s+/g, '\n'); // Normalize whitespace after newlines
};

// Generate a concept card for educational content
export const generateConceptCard = async (
  query: string
): Promise<Omit<supabaseService.ConceptCard, 'id' | 'created_at'> | null> => {
  // Track which models we've tried to avoid infinite loops
  const triedModels = new Set<string>();
  
  // Function to attempt generation with fallbacks
  const attemptCardGeneration = async (modelId: string): Promise<Omit<supabaseService.ConceptCard, 'id' | 'created_at'> | null> => {
    try {
      triedModels.add(modelId); // Mark this model as tried
      console.log(`[CONCEPT CARD] Attempting to generate card with model: ${modelId}`);
      
      // Get the API version for this model
      const apiVersion = getApiVersion(modelId);
      console.log(`[CONCEPT CARD] Using API version: ${apiVersion} for model: ${modelId}`);
      
      const prompt = `Generate educational content for a concept card based on this query: "${query}"
      
      Format the response as JSON with these fields:
      {
        "title": "A concise, memorable title for this concept",
        "content": "Clear, concise explanation (2-3 paragraphs)",
          "category": "One of: Physics, Chemistry, Biology, Other"
        }
        
        Make sure the category is most relevant to the query's subject matter.
      The category MUST be exactly one of: "Physics", "Chemistry", "Biology", or "Other".
      Be precise in categorization - use Physics for physical sciences, Chemistry for chemical sciences, Biology for life sciences, and Other for everything else.
      `;
      
      try {
        // Use the specified model
        console.log('[CONCEPT CARD] Using model:', modelId);
        const model = genAI.getGenerativeModel({ model: modelId });
        
        console.log('[CONCEPT CARD] Generating card with model:', modelId);
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        console.log('[CONCEPT CARD] Raw response:', response.substring(0, 100) + '...');
        
        // Extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error('[CONCEPT CARD] No JSON found in response');
          throw new Error('No JSON found in the response');
        }
        
        const jsonText = jsonMatch[0];
        // Sanitize the JSON string before parsing
        const sanitizedJson = sanitizeJsonString(jsonText);
        const parsedResult = JSON.parse(sanitizedJson);
        
        // Validate the expected structure
        if (!parsedResult.title || !parsedResult.content || !parsedResult.category) {
          console.error('[CONCEPT CARD] Missing required fields in response');
          throw new Error('Response missing required fields');
        }
        
        // Ensure category is one of the valid options
        if (!validCategories.includes(parsedResult.category)) {
          console.log(`[CONCEPT CARD] Invalid category: ${parsedResult.category}, defaulting to 'Other'`);
          parsedResult.category = 'Other';
        }
        
        return parsedResult;
      } catch (sdkError) {
        console.error(`[CONCEPT CARD] SDK error with model ${modelId}:`, sdkError);
        
        // If we get a model not found error, try direct API call with correct version
        if (sdkError instanceof Error && 
           (sdkError.message.includes('not found') || 
            sdkError.message.includes('404'))) {
          
          console.log(`[CONCEPT CARD] Trying direct API call for model ${modelId} with version ${apiVersion}`);
          
          const response = await fetch(
            `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelId}:generateContent?key=${API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [{ text: prompt }]
                }],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 1024
                }
              })
            }
          );
          
          if (!response.ok) {
            throw new Error(`Direct API call failed: ${response.status}`);
          }
          
          const data = await response.json();
          const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          console.log('[CONCEPT CARD] Raw response from direct call:', responseText.substring(0, 100) + '...');
          
          // Extract JSON from the response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            console.error('[CONCEPT CARD] No JSON found in direct API response');
            throw new Error('No JSON found in the response');
          }
          
          const jsonText = jsonMatch[0];
          // Sanitize the JSON string before parsing
          const sanitizedJson = sanitizeJsonString(jsonText);
          const parsedResult = JSON.parse(sanitizedJson);
          
          // Validate the expected structure
          if (!parsedResult.title || !parsedResult.content || !parsedResult.category) {
            console.error('[CONCEPT CARD] Missing required fields in direct API response');
            throw new Error('Response missing required fields');
          }
          
          // Ensure category is one of the valid options
          if (!validCategories.includes(parsedResult.category)) {
            console.log(`[CONCEPT CARD] Invalid category: ${parsedResult.category}, defaulting to 'Other'`);
            parsedResult.category = 'Other';
          }
          
          return parsedResult;
        }
        
        // If not a 404, rethrow the error
        throw sdkError;
      }
      
    } catch (error) {
      console.error(`[CONCEPT CARD] Error with model ${modelId}:`, error);
      
      // Check for rate limit errors and try fallbacks
      if (error instanceof Error && 
          (error.message.includes('quota') || 
           error.message.includes('429') || 
           error.message.includes('rate limit'))) {
        
        console.log('[CONCEPT CARD] Rate limit hit, trying fallback model');
        
        // Define fallback models for concept cards
        const fallbackModels = [
          'gemini-pro',        // Standard model 
          'gemini-1.5-pro',    // Advanced model
          'gemini-1.5-flash'   // Fast model
        ];
        
        // Try each fallback model that hasn't been tried yet
        for (const fallbackModel of fallbackModels) {
          if (!triedModels.has(fallbackModel)) {
            console.log(`[CONCEPT CARD] Trying fallback model: ${fallbackModel}`);
            return attemptCardGeneration(fallbackModel);
          }
        }
        
        // If we've tried all models, return a simplified concept card
        console.log('[CONCEPT CARD] All models exhausted, returning simplified card');
        return {
          title: 'Concept Card Unavailable',
          content: 'Sorry, I was unable to generate a detailed concept card at this time due to high demand. Please try again later.',
          category: 'Other',
        };
      }
      
      // Check if the error is related to model not being found
      if (error instanceof Error && 
          (error.message.includes('not found') || 
           error.message.includes('404'))) {
        console.log(`[CONCEPT CARD] Model ${modelId} not found. Trying fallback models.`);
        
        // Define fallback models for API version issues
        const fallbackModels = [
          'gemini-pro',
          'gemini-1.5-flash'
        ];
        
        // Try fallbacks
        for (const fallbackModel of fallbackModels) {
          if (!triedModels.has(fallbackModel)) {
            console.log(`[CONCEPT CARD] Trying API version compatible model: ${fallbackModel}`);
            return attemptCardGeneration(fallbackModel);
          }
        }
        
        // If we've tried all fallbacks, return a simplified card
        return {
          title: 'Concept Card Error',
          content: 'Sorry, I was unable to generate a concept card with the selected model. Please try a different model.',
          category: 'Other',
        };
      }
      
      // For other errors, return null
      return null;
    }
  };
  
  // Start with gemini-pro model as the default and try fallbacks if needed
  return attemptCardGeneration('gemini-pro');
};

// Helper function to format content parts
function formatParts(content: string | Array<{ text?: string }>): any[] {
  if (!content) {
    console.warn('Empty content provided to formatParts');
    return [{ text: '' }];
  }
  
  if (typeof content === 'string') {
    return [{ text: content }];
  }
  
  try {
    const parts: any[] = [];
    
    for (const item of content) {
      if (item.text) {
        parts.push({ text: item.text });
      } else {
        console.warn('Empty part or unsupported content found in message');
        parts.push({ text: '' });
      }
    }
    
    // Ensure we have at least one part
    if (parts.length === 0) {
      parts.push({ text: '' });
    }
    
    return parts;
  } catch (error) {
    console.error('Error formatting parts:', error);
    return [{ text: 'Error formatting content' }];
  }
}

// Extract base64 data from a File object
export const fileToGenerativePart = async (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    console.log(`Processing image: ${file.name}, type: ${file.type}, size: ${(file.size / 1024).toFixed(2)} KB`);
    
    // Check valid image type - support more formats
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      return reject(new Error(`Unsupported image format (${file.type}). Please use JPEG, PNG, WEBP, or GIF.`));
    }
    
    // Check file size (max 10MB absolute limit)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB absolute max
    if (file.size > MAX_SIZE) {
      return reject(new Error(`Image is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Please use an image smaller than 10MB.`));
    }
    
    // Function to compress the image
    const compressImage = (imageFile: File, maxWidthHeight = 1024, quality = 0.8): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          // Create a canvas element
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate the new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidthHeight) {
              height = Math.round(height * (maxWidthHeight / width));
              width = maxWidthHeight;
            }
          } else {
            if (height > maxWidthHeight) {
              width = Math.round(width * (maxWidthHeight / height));
              height = maxWidthHeight;
            }
          }
          
          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;
          
          // Draw the image on the canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Failed to get canvas context'));
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert canvas to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Failed to compress image'));
              }
              resolve(blob);
            },
            'image/jpeg',
            quality
          );
        };
        
        img.onerror = () => reject(new Error('Failed to load image for compression'));
        img.src = URL.createObjectURL(imageFile);
      });
    };
    
    // Determine if image needs compression based on file size
    const shouldCompress = file.size > 1 * 1024 * 1024; // Compress if > 1MB
    
    // Function to process with or without compression
    const processImage = async () => {
      try {
        // Apply compression if needed
        let processedFile = file;
        
        if (shouldCompress) {
          console.log(`Image is large (${(file.size / (1024 * 1024)).toFixed(2)}MB), applying compression`);
          
          // Determine compression parameters based on size
          let quality = 0.8;
          let maxDimension = 1024;
          
          if (file.size > 5 * 1024 * 1024) {
            quality = 0.6;
            maxDimension = 800;
          } else if (file.size > 3 * 1024 * 1024) {
            quality = 0.7;
            maxDimension = 900;
          }
          
          const compressedBlob = await compressImage(file, maxDimension, quality);
          processedFile = new File([compressedBlob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          console.log(`Compressed image from ${(file.size / 1024).toFixed(2)}KB to ${(processedFile.size / 1024).toFixed(2)}KB`);
        }
        
        // Now process the (possibly compressed) file
        const reader = new FileReader();
        
        reader.onload = () => {
          try {
            const dataUrl = reader.result as string;
            const [header, base64Data] = dataUrl.split(',');
            
            if (!base64Data) {
              return reject(new Error('Failed to extract image data. The file may be corrupted.'));
            }
            
            // Extract MIME type from data URL
            const mimeMatch = header.match(/data:(.*?);/);
            if (!mimeMatch) {
              return reject(new Error('Invalid image data format. Please try another image.'));
            }
            
            const mimeType = mimeMatch[1];
            
            // Calculate approximate token size (1 token ~ 4 chars of base64)
            const approximateTokens = Math.ceil(base64Data.length / 4);
            console.log(`Image base64 data length: ${base64Data.length}, approximate tokens: ${approximateTokens}`);
            
            // Check if the base64 data is too large
            if (approximateTokens > 600000) { // Getting close to the token limit
              return reject(new Error('Image is too large for processing after conversion. Please use a smaller image.'));
            }
            
            console.log(`Successfully processed image: ${mimeType}, data length: ${base64Data.length}`);
            
            // Return in proper Google Generative AI format
            resolve({
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            });
          } catch (error) {
            console.error('Error processing image data:', error);
            reject(new Error(`Error processing image data: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        };
        
        reader.onerror = (error) => {
          console.error('Error reading image file:', error);
          reject(new Error('Failed to read image file. The file may be corrupted or too large.'));
        };
        
        // Read as data URL
        reader.readAsDataURL(processedFile);
      } catch (error) {
        console.error('Error compressing image:', error);
        reject(new Error(`Error processing image: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    // Start the image processing
    processImage().catch(error => {
      console.error('Error in image processing:', error);
      reject(error);
    });
  });
};

export const generateChatTitle = async (content: string): Promise<string> => {
  // Track which models we've tried to avoid infinite loops
  const triedModels = new Set<string>();
  
  // Function to attempt title generation with fallbacks
  const attemptTitleGeneration = async (modelId: string): Promise<string> => {
    try {
      triedModels.add(modelId); // Mark this model as tried
      console.log(`TITLE GENERATION: Starting with model ${modelId}, content length:`, content.length);
      
      // Get the API version for this model
      const apiVersion = getApiVersion(modelId);
      console.log(`TITLE GENERATION: Using API version: ${apiVersion} for model: ${modelId}`);
      
      // Make a direct API call to Gemini using fetch
      const trimmedContent = content.substring(0, 500); // Limit the content length
      
      // Build a very simple prompt that just asks for a title
      const prompt = `Generate a brief, descriptive chat title (3-5 words max) based on this conversation: "${trimmedContent}"
      The title should be specific to what the conversation is actually about.
      Return ONLY the title text with no quotes, explanation or additional formatting.`;
      
      console.log(`TITLE GENERATION: Making direct API call with model ${modelId}`);
      
      // Format the API request
      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 50
        }
      };
      
      // Make the API call directly with the correct API version
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelId}:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`TITLE GENERATION: API error: ${response.status} - ${errorText}`);
        
        // If rate limited, throw a specific error
        if (response.status === 429) {
          throw new Error(`RATE_LIMIT: ${errorText}`);
        }
        
        // If model not found, throw a specific error
        if (response.status === 404) {
          throw new Error(`MODEL_NOT_FOUND: ${errorText}`);
        }
        
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('TITLE GENERATION: Got API response:', JSON.stringify(responseData).substring(0, 200));
      
      // Extract the text from the response
      let title = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Clean up the title
      title = title.trim()
        .replace(/^["'](.*)["']$/, '$1') // Remove surrounding quotes
        .replace(/^Title:?\s*/i, '')     // Remove "Title:" prefix
        .replace(/\.$/, '')              // Remove trailing period
        .replace(/Chat title:?\s*/i, '') // Remove "Chat title:" prefix
        .trim();
        
      console.log('TITLE GENERATION: Processed title:', title);
      
      // Check if we got a valid title
      if (!title || 
          title.toLowerCase().includes('new conversation') || 
          title.length < 3 || 
          title.length > 50) {
        console.log('TITLE GENERATION: Invalid title, using timestamp fallback');
        return getTimestampTitle();
      }
      
      console.log('TITLE GENERATION: Final title:', title);
      return title;
    } catch (error) {
      console.error(`TITLE GENERATION: Error with model ${modelId}:`, error);
      
      // Check for rate limit errors and try fallbacks
      if (error instanceof Error && 
          (error.message.includes('quota') || 
           error.message.includes('429') || 
           error.message.includes('RATE_LIMIT') || 
           error.message.includes('rate limit'))) {
        
        console.log('TITLE GENERATION: Rate limit hit, trying fallback model');
        
        // Define fallback models for title generation
        const fallbackModels = [
          'gemini-pro',        // Standard model
          'gemini-1.5-flash',  // Fast model
          'gemini-1.0-pro'     // Legacy model
        ];
        
        // Try each fallback model that hasn't been tried yet
        for (const fallbackModel of fallbackModels) {
          if (!triedModels.has(fallbackModel)) {
            console.log(`TITLE GENERATION: Trying fallback model: ${fallbackModel}`);
            return attemptTitleGeneration(fallbackModel);
          }
        }
        
        // If all models failed, use timestamp
        console.log('TITLE GENERATION: All models exhausted, using timestamp');
        return getTimestampTitle();
      }
      
      // Check if the error is related to model not being found
      if (error instanceof Error && 
          (error.message.includes('not found') || 
           error.message.includes('404') ||
           error.message.includes('MODEL_NOT_FOUND'))) {
        console.log(`TITLE GENERATION: Model ${modelId} not found. Trying fallback models.`);
        
        // Define fallback models for API version issues
        const fallbackModels = [
          'gemini-pro',
          'gemini-1.5-flash'
        ];
        
        // Try fallbacks
        for (const fallbackModel of fallbackModels) {
          if (!triedModels.has(fallbackModel)) {
            console.log(`TITLE GENERATION: Trying API version compatible model: ${fallbackModel}`);
            return attemptTitleGeneration(fallbackModel);
          }
        }
        
        // If all fallbacks failed, use timestamp
        console.log('TITLE GENERATION: All API-compatible fallbacks exhausted, using timestamp');
        return getTimestampTitle();
      }
      
      // For any other error, use timestamp title
      return getTimestampTitle();
    }
  };
  
  // Helper function to generate timestamp-based title
  const getTimestampTitle = (): string => {
    return 'Chat ' + new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Start with gemini-pro as default
  return attemptTitleGeneration('gemini-pro');
};

// Add response template instructions to the system prompt
export const getSystemPrompt = (model: string = 'gemini-pro') => {
  const basePrompt = `You are an AI assistant that helps users with various tasks. Provide clear, concise, and accurate responses.`;
  
  // For educational content, add the template instructions
  const educationalPrompt = `
When responding to educational questions, please PRECISELY FOLLOW THIS TEMPLATE:

- Begin with a small brief of 2-4 lines in small text (italics).
- Include "Subject: {Subject Name} | Topic: {Topic/Chapter Name}"
- Include the original "Question: {User's question}"
- Provide "Solution:" with step-by-step explanations
- If applicable, include a section for "Tricks:" with mnemonics or helpful tips
- End with "Concept card generation status: *Generated*"

Example format:
*Brief explanation of the concept in 2-4 lines*

**Subject**: Physics | **Topic**: Kinematics

**Question**: Calculate the displacement of an object that moves 3m east, then 4m north.

**Solution**:
**Step 1**: Identify the components of displacement (3m east, 4m north)
**Step 2**: Use the Pythagorean theorem to find the resultant displacement
**Step 3**: d = √(3² + 4²) = √(9 + 16) = √25 = 5m
**Step 4**: The displacement is 5 meters at an angle of tan⁻¹(4/3) = 53.1° north of east

____________________________________________________
**Tricks**:
Remember "EAST-NORTH-UP" as positive directions in a 3D coordinate system.
____________________________________________________

**Concept card generation status**: *Generated*
`;

  return model === 'gemini-pro' ? basePrompt + educationalPrompt : basePrompt;
};

// More sophisticated function to pre-process educational queries
const processEducationalQuery = (query: string): {
  subject: string;
  topic: string;
  question: string;
  isForcedTemplate: boolean;
} => {
  // Default values
  const result = {
    subject: 'General Knowledge',
    topic: 'Conceptual Understanding',
    question: query.trim(),
    isForcedTemplate: false
  };
  
  // Check if the query already contains a template structure
  // Format: Subject: X | Topic: Y
  const subjectTopicMatch = query.match(/subject\s*:\s*([^|]+)\s*\|\s*topic\s*:\s*([^\n]+)/i);
  
  if (subjectTopicMatch) {
    result.subject = subjectTopicMatch[1].trim();
    result.topic = subjectTopicMatch[2].trim();
    result.isForcedTemplate = true;
  } else {
    // Use the detection function to get subject and topic
    const detected = detectSubjectAndTopic(query);
    result.subject = detected.subject;
    result.topic = detected.topic;
  }
  
  // Extract the actual question
  // If the query contains "Question:" followed by text, use that
  const questionMatch = query.match(/question\s*:\s*([^\n]+)/i);
  
  if (questionMatch) {
    result.question = questionMatch[1].trim();
    result.isForcedTemplate = true;
  } else {
    // Otherwise use the standard extraction
    result.question = extractQuestion(query);
  }
  
  // If the query contains "TEMPLATE" or "FORMAT", user is explicitly requesting a template
  if (/template|format/i.test(query)) {
    result.isForcedTemplate = true;
  }
  
  // Clean up subject and topic names
  result.subject = result.subject
    .replace(/^in\s+/i, '')
    .replace(/^about\s+/i, '')
    .replace(/^regarding\s+/i, '')
      .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
  result.topic = result.topic
    .replace(/^in\s+/i, '')
    .replace(/^about\s+/i, '')
    .replace(/^regarding\s+/i, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return result;
};

export const getAIResponse = async (
  query: string,
  options?: {
    historyMessages?: Message[];
    chatTopic?: string;
    temperature?: number;
    model?: string;
  }
) => {
  try {
    const model = options?.model || 'gemini-pro';
    const temperature = options?.temperature || 0.7;
    const prompt = getGeminiPrompt(model);
    const historyMessages = options?.historyMessages || [];
    
    // Process the query to determine if it's educational - NO LONGER FORCING TEMPLATE
    const isEducational = detectEducationalQuery(query);
    console.log('Educational query detected:', isEducational);
    
    // If educational, use our advanced processing function
    let templateData = { subject: '', topic: '', question: '', isForcedTemplate: false };
    if (isEducational) {
      templateData = processEducationalQuery(query);
    }
    
    // Build the chat history for Gemini
    const history = historyMessages.map((msg) => ({
      role: msg.role as 'user' | 'model',
      parts: [{ text: msg.content }],
    }));

    // Create the Gemini model
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const geminiModel = genAI.getGenerativeModel({
      model: model,
      generationConfig: {
        temperature: isEducational ? 0.2 : temperature, // Lower temperature only for educational queries
        maxOutputTokens: 4000,
      },
    });

    const chat = history.length > 0 ? geminiModel.startChat({
      history,
      generationConfig: {
        temperature: isEducational ? 0.2 : temperature,
        maxOutputTokens: 4000,
      },
    }) : null;

    // Prepare the query - ONLY use template format for educational queries
    let modifiedQuery = query;
    if (isEducational || templateData.isForcedTemplate) {
      modifiedQuery = `IMPORTANT SYSTEM INSTRUCTION: THIS IS AN EDUCATIONAL QUERY. 
      
The user's message: "${templateData.question}"

YOU MUST RESPOND USING THIS EXACT TEMPLATE FORMAT WITH NO DEVIATIONS:

*[1-2 sentence summary of the answer]*

## **${templateData.subject}** | *${templateData.topic}*

### **Question:** 
${templateData.question}

### **Solution:** 
Step 1: [First step]
Step 2: [Second step]
...

### **💡 Tricks & Tips:**
[Optional tips, mnemonics, or shortcuts to remember the concept]

DO NOT ADD ANY TEXT BEFORE OR AFTER THIS TEMPLATE.
DO NOT CHANGE THE SECTION HEADINGS OR FORMAT.
FOLLOW THIS TEMPLATE EXACTLY WITH NO MODIFICATIONS TO THE STRUCTURE.`;
    }

    // Get the response from Gemini
    let response = '';
    if (chat) {
      const result = await chat.sendMessage(modifiedQuery);
      response = result.response.text();
    } else {
      const result = await geminiModel.generateContent(prompt + '\n\nUser: ' + modifiedQuery);
      response = result.response.text();
    }

    // ONLY ensure educational responses follow the template format
    if (isEducational || templateData.isForcedTemplate) {
      // Check if the response follows the template format
      const hasProperFormat = 
        response.includes('##') && 
        response.includes('###') && 
        response.includes('**Question:**') && 
        response.includes('**Solution:**') && 
        response.includes('**💡 Tricks & Tips:**');
      
      // If not in the proper format, create our own template ONLY for educational queries
      if (!hasProperFormat) {
        console.log('Response does not follow template, forcing reformatting...');
        const extracted = extractFromIncompleteResponse(response);
        response = createResponseTemplate(
          templateData.subject,
          templateData.topic,
          templateData.question,
          extracted.solution,
          extracted.tricks
        );
      }
    }

    return response;
  } catch (error) {
    console.error('Error getting AI response:', error);
    return 'I apologize, but I encountered an error processing your request. Please try again.';
  }
};

// Helper function to extract solution and tricks from incomplete responses
const extractFromIncompleteResponse = (response: string): { solution: string; tricks: string } => {
  // Default values
  let solution = '';
  let tricks = '';
  
  // Extract the most detailed part as the solution
  const lines = response.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  
  if (nonEmptyLines.length > 0) {
    // If there are sections already, try to identify them
    const solutionSection = findSection(response, ['solution', 'answer', 'explanation', 'steps', 'working']);
    const tricksSection = findSection(response, ['tricks', 'tips', 'hint', 'note', 'remember']);
    
    // If solution section found, use it
    if (solutionSection) {
      solution = solutionSection;
    } else {
      // Otherwise use the main content
      solution = nonEmptyLines.join('\n');
    }
    
    // If tricks section found, use it
    if (tricksSection) {
      tricks = tricksSection;
    } else {
      // Try to identify any tips or tricks in the text
      const potentialTricks = nonEmptyLines.filter(line => 
        line.toLowerCase().includes('tip') || 
        line.toLowerCase().includes('trick') || 
        line.toLowerCase().includes('hint') ||
        line.toLowerCase().includes('note') ||
        line.toLowerCase().includes('remember')
      );
      
      if (potentialTricks.length > 0) {
        tricks = potentialTricks.join('\n');
      }
    }
  }
  
  return { solution, tricks };
};

// Helper function to find a specific section in the text
const findSection = (text: string, sectionKeywords: string[]): string | null => {
  const lines = text.split('\n');
  let capturingSection = false;
  let sectionContent: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Check if this is a section header
    const isHeader = sectionKeywords.some(keyword => 
      line.includes(`${keyword}:`) || 
      line.includes(`${keyword.toUpperCase()}:`) ||
      line.startsWith(`# ${keyword}`) ||
      line.startsWith(`## ${keyword}`)
    );
    
    if (isHeader) {
      capturingSection = true;
      // Start with the current line
      sectionContent.push(lines[i]);
    } else if (capturingSection) {
      // Stop capturing if we hit another section header
      const isAnotherHeader = line.includes(':') && line.split(':')[0].trim().length < 20;
      if (isAnotherHeader && sectionContent.length > 0) {
        break;
      }
      sectionContent.push(lines[i]);
    }
  }
  
  return sectionContent.length > 0 ? sectionContent.join('\n') : null;
};

// Get the appropriate prompt for the Gemini model
const getGeminiPrompt = (model: string): string => {
  // Base prompt for all models
  const basePrompt = `You are the Emerce AI assistant, designed to be helpful, informative, and engaging.`;
  
  // Additional educational instructions for certain models
  const educationalPrompt = `
  
  For educational questions, follow this EXACT template:
  
  *[2-4 sentence summary of the answer]*

  ## **[Subject]** | *[Topic]*

  ### **Question:** 
  [Original question]

  ### **Solution:** 
  **Step 1:**   [First step]
  **Step 2:**   [Second step]
  ...

  ### **💡 Tricks & Tips:**
  [Optional tips, mnemonics, or shortcuts to remember the concept]
  
  YOU MUST RESPOND USING THIS EXACT TEMPLATE FORMAT FOR EDUCATIONAL QUERIES - NO EXCEPTIONS.
  `;
  
  // Return appropriate prompt based on model
  return model === 'gemini-pro' ? basePrompt + educationalPrompt : basePrompt;
};

// Generate an image using Gemini API - update to use correct API version
export const generateImage = async (prompt: string): Promise<string | null> => {
  try {
    console.log('[IMAGE GENERATION] Generating image with prompt:', prompt);
    
    // Get the correct API version for image generation
    const imageModelId = 'gemini-2.0-flash-exp-image-generation';
    const apiVersion = getApiVersion(imageModelId);
    
    // Use the image generation model with correct API version
    const response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${imageModelId}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseModalities: ["Text", "Image"]
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[IMAGE GENERATION] API error:', response.status, errorText);
      throw new Error(`API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[IMAGE GENERATION] Response received:', data);

    // Extract the base64 image data from the response
    if (data.candidates && 
        data.candidates[0] && 
        data.candidates[0].content && 
        data.candidates[0].content.parts) {
      
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          console.log('[IMAGE GENERATION] Successfully generated image');
          return part.inlineData.data; // Return base64 data
        }
      }
    }
    
    console.error('[IMAGE GENERATION] No image found in response');
    return null;
  } catch (error) {
    console.error('[IMAGE GENERATION] Error generating image:', error);
    return null;
  }
};

// Check if a message is an image generation command
export const isImageGenerationCommand = (text: string): boolean => {
  return text.trim().startsWith('/image ');
};

// Extract the image prompt from a command
export const extractImagePrompt = (text: string): string => {
  return text.trim().substring('/image '.length).trim();
}; 