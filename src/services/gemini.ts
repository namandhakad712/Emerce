import { GoogleGenerativeAI, GenerativeModel, GenerationConfig, Content, Part } from '@google/generative-ai';
import * as supabaseService from './supabase';

interface Message {
  role: string;
  content: string;
  timestamp?: number;
  id?: string;
}

// Define model interface
export interface GeminiModel {
  id: string;
  name: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
}

// Initialize the Gemini API with the API key
const API_KEY = 'AIzaSyC81EywHHPaslM_nTBEyBO-FWaXLc-tXvc';
const genAI = new GoogleGenerativeAI(API_KEY);

// Available models - will be updated dynamically 
export let AVAILABLE_MODELS: GeminiModel[] = [
  { id: 'gemini-pro', name: 'Gemini Pro' },
];

// Default generation config
const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
};

// Fetch available models using the REST API directly
export const fetchAvailableModels = async () => {
  try {
    // Direct REST API call to models endpoint - using v1
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + API_KEY);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Available models data:', data);
    
    if (data && data.models && Array.isArray(data.models)) {
      // Map the response to our format
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
          
          return {
            id: modelId,
            name: displayName,
            description: model.description || '',
            inputTokenLimit: model.inputTokenLimit || 0,
            outputTokenLimit: model.outputTokenLimit || 0,
            supportedGenerationMethods: model.supportedGenerationMethods || [],
            multimodal: modelId.includes('vision') || 
                      modelId.includes('1.5')
          };
        });
      
      // Sort models by version (newest first)
      availableModels.sort((a, b) => {
        // First sort by generation (2.5, 2.0, 1.5, 1.0)
        const versionA = a.id.match(/(\d+\.\d+)/)?.[1] || '0.0';
        const versionB = b.id.match(/(\d+\.\d+)/)?.[1] || '0.0';
        
        if (versionA !== versionB) {
          return parseFloat(versionB) - parseFloat(versionA);
        }
        
        // Then sort by capability (pro before flash)
        if (a.id.includes('pro') && !b.id.includes('pro')) return -1;
        if (!a.id.includes('pro') && b.id.includes('pro')) return 1;
        
        // Then by variant (non-exp before exp)
        if (a.id.includes('exp') && !b.id.includes('exp')) return 1;
        if (!a.id.includes('exp') && b.id.includes('exp')) return -1;
        
        return a.id.localeCompare(b.id);
      });
      
      if (availableModels.length > 0) {
        console.log('Found models:', availableModels);
        AVAILABLE_MODELS = availableModels;
      } else {
        console.log('No Gemini models found in the response');
      }
    } else {
      console.error('Unexpected response format:', data);
    }
    
    return AVAILABLE_MODELS;
  } catch (error) {
    console.error('Error fetching available models:', error);
    
    // Fallback: Try to initialize specific known models
    try {
      const fallbackModelIds = [
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-pro',
        'gemini-pro-vision'
      ];
      
      const availableModels = [];
      
      for (const modelId of fallbackModelIds) {
        try {
          // Try to initialize a model - if it fails, the model isn't available
          const model = genAI.getGenerativeModel({ model: modelId });
          
          // Format the name nicely
          let name = modelId
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
          
          const isMultimodal = modelId.includes('vision') || 
                            modelId.includes('1.5');
          
          availableModels.push({
            id: modelId,
            name: name,
            multimodal: isMultimodal
          });
          
          console.log(`Model ${modelId} is available`);
        } catch (error) {
          console.log(`Model ${modelId} is not available:`, error);
        }
      }
      
      if (availableModels.length > 0) {
        AVAILABLE_MODELS = availableModels;
      }
    } catch (fallbackError) {
      console.error('Fallback model detection also failed:', fallbackError);
    }
    
    return AVAILABLE_MODELS; // Return whatever models we could find
  }
};

// Generate AI response
export const generateResponse = async (
  messages: { role: string; content: string | Array<{ text?: string }> }[],
  modelId: string = 'gemini-pro',
  generationConfig: GenerationConfig = DEFAULT_GENERATION_CONFIG
) => {
  // Add this at the beginning of the function
  console.log('🔍 Using Google AI SDK version:', (genAI as any).client?.apiVersion || 'unknown');
  console.log('🔍 API endpoint:', (genAI as any).client?.apiEndpoint || 'default');
  console.log('🔍 Using model:', modelId);

  try {
    // Basic error handling - validate messages
    if (!messages || messages.length === 0) {
      console.error('No messages provided to generateResponse');
      return {
        role: 'assistant',
        content: 'I need some input to respond to. Please provide a question or message.',
      };
    }
    
    console.log(`Generating response with model: ${modelId}, messages count: ${messages.length}`);
    
    // Make sure we have at least one valid message with content
    const validMessages = messages.filter(msg => 
      msg.content && (
        (typeof msg.content === 'string' && msg.content.trim() !== '') || 
        (Array.isArray(msg.content) && msg.content.length > 0)
      )
    );
    
    if (validMessages.length === 0) {
      console.warn('No valid messages with content found');
      return {
        role: 'assistant',
        content: 'I need some input to respond to. Please provide a question or message.',
      };
    }

    try {
      // Safety check - try to handle API version issues by using a direct fetch if the SDK fails
      const directFetch = async (text: string) => {
        try {
          console.log("Using direct API fetch as fallback method with v1 endpoint");
          // Format the API request
          const requestBody = {
            contents: [
              {
                parts: [
                  { text }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024
            }
          };
          
          // Make the API call directly
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestBody)
            }
          );
          
          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }
          
          const responseData = await response.json();
          const text = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
          
          return {
            role: 'assistant',
            content: text,
          };
        } catch (directError) {
          console.error("Direct API fetch also failed:", directError);
          throw directError;
        }
      };

      // Determine if this is an educational question that needs the template
      const lastMessage = messages[messages.length - 1];
      const userMessage = typeof lastMessage.content === 'string' ? 
        lastMessage.content : 
        JSON.stringify(lastMessage.content);
      
      // Only use template for educational queries
      const isEducationalQuery = detectEducationalQuery(userMessage);
      console.log('Message type detection - Educational query:', isEducationalQuery);
      
      // Determine if this is a factual query that needs high accuracy
      const isFactualQuery = userMessage.toLowerCase().includes('what is') || 
                            userMessage.toLowerCase().includes('define') ||
                            userMessage.toLowerCase().includes('explain') ||
                            userMessage.toLowerCase().includes('how does') ||
                            userMessage.toLowerCase().includes('why does');
      
      // Select the most appropriate model based on query type
      let selectedModelId = modelId;
      if (isFactualQuery && !isEducationalQuery) {
        selectedModelId = 'gemini-pro'; // Use pro model for factual queries
      }
      
      // Prepare the model with system instructions
      const model = genAI.getGenerativeModel({ 
        model: selectedModelId,
        generationConfig: {
          ...generationConfig,
          // Use lower temperature for factual and educational queries
          temperature: isFactualQuery || isEducationalQuery ? 0.2 : (generationConfig.temperature || 0.7),
          // Increase top_k and top_p for more accurate responses
          topK: isFactualQuery ? 20 : 40,
          topP: isFactualQuery ? 0.8 : 0.95,
          // Increase max tokens for more detailed responses
          maxOutputTokens: isFactualQuery ? 2048 : 1024,
        }
      });
      
      let response;
      
      // Convert messages to the format expected by Gemini API
      const formattedMessages: Content[] = [];
      
      // First message is special - it might have text and image parts
      const firstMessage = validMessages[0];
      
      // Handle multimodal content (message with text and images)
      if (Array.isArray(firstMessage.content)) {
        // We have a multimodal message with potentially both text and images
        const parts: Part[] = [];
        
        for (const part of firstMessage.content) {
            if (part.text) {
            parts.push({ text: part.text });
            } else if (part.image_url) {
            // For inline image data URL
            if (part.image_url.startsWith('data:')) {
              const [mimeType, base64Data] = part.image_url.split(',');
              if (base64Data) {
                parts.push({
                  inlineData: {
                    data: base64Data,
                    mimeType: mimeType.replace('data:', '').split(';')[0]
                  }
                });
              }
            } else if (part.image_url.startsWith('http')) {
              // For external image URLs - although Gemini API doesn't really support these directly
              console.warn('External image URLs are not supported by Gemini API');
        } else {
              // For base64 data without data URL prefix
              parts.push({
                inlineData: {
                  data: part.image_url,
                  mimeType: 'image/jpeg' // Default to JPEG if not specified
                }
              });
            }
          }
        }
        
        formattedMessages.push({
          role: firstMessage.role === 'user' ? 'user' : 'model',
          parts
        });
      } else {
        // Simple text message
        formattedMessages.push({
          role: firstMessage.role === 'user' ? 'user' : 'model',
          parts: [{ text: firstMessage.content }]
        });
      }
      
      // Add the rest of the messages (which should be text only)
      for (let i = 1; i < validMessages.length; i++) {
        const msg = validMessages[i];
        const content = typeof msg.content === 'string' ? 
          msg.content : 
          JSON.stringify(msg.content);
        
        formattedMessages.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: content }]
        });
      }
      
      console.log('Formatted messages:', JSON.stringify(formattedMessages.map(m => ({ role: m.role, length: m.parts.length }))));
      
      // Generate the content
      try {
        const chat = model.startChat({
          history: formattedMessages.slice(0, -1),
          generationConfig: {
            ...generationConfig,
            // Use lower temperature for factual and educational responses
            temperature: isFactualQuery || isEducationalQuery ? 0.2 : (generationConfig.temperature || 0.7),
            // Increase top_k and top_p for more accurate responses
            topK: isFactualQuery ? 20 : 40,
            topP: isFactualQuery ? 0.8 : 0.95,
            // Increase max tokens for more detailed responses
            maxOutputTokens: isFactualQuery ? 2048 : 1024,
          }
        });
        
        const lastMessageContent = formattedMessages[formattedMessages.length - 1].parts[0].text || '';
        
        // Only use template for educational queries that don't include images
        let promptWithInstructions = lastMessageContent;
        
        if (isEducationalQuery) {
          // Process the query to determine subject and topic
          const { subject, topic } = detectSubjectAndTopic(userMessage);
          const question = extractQuestion(userMessage);
          
          // Only apply template for educational queries
          promptWithInstructions = `${lastMessageContent}

THIS IS A VERY IMPORTANT SYSTEM INSTRUCTION! 

YOU MUST RESPOND USING THIS EXACT TEMPLATE FORMAT WITH NO DEVIATIONS:

*[1-2 sentence summary of the answer]*

## **${subject}** | *${topic}*

### **Question:** 
${question}

### **Solution:** 
Step 1: [First step]
Step 2: [Second step]
...

### **💡 Tricks & Tips:**
[Optional tips, mnemonics, or shortcuts to remember]

DO NOT ADD ANY TEXT BEFORE OR AFTER THIS TEMPLATE.
DO NOT CHANGE THE FORMATTING OR STRUCTURE.
YOU MUST FOLLOW THIS TEMPLATE EXACTLY!`;
        } else if (isFactualQuery) {
          // Add instructions for factual queries to ensure accuracy
          promptWithInstructions = `${lastMessageContent}

Please provide a clear, accurate, and well-structured response. Include relevant details and examples where appropriate. If you're unsure about any part of the answer, please say so explicitly.`;
        }
        
        console.log('Sending final prompt to model:', promptWithInstructions.substring(0, 100) + '...');
        
        try {
          // Get the response
          response = await chat.sendMessage(promptWithInstructions);
          console.log('Response received, text length:', response.response.text().length);
        } catch (messageError) {
          console.error('Error sending message to model:', messageError);
          
          // Try a simpler approach without history for image messages
          if (Array.isArray(firstMessage.content) && 
              firstMessage.content.some(part => part.image_url)) {
            console.log('Attempting direct generation for image message without chat history');
            try {
              const result = await model.generateContent(formattedMessages[formattedMessages.length - 1].parts);
              return {
                role: 'assistant',
                content: result.response.text(),
              };
            } catch (directError) {
              console.error('Direct generation also failed:', directError);
              throw directError;
            }
          } else {
            throw messageError;
          }
        }
        
        // Only check template for educational queries that don't include images
        if (isEducationalQuery) {
          const responseText = response.response.text();
          
          // Strict check for template compliance
          if (!responseText.includes('##') || 
              !responseText.includes('**Question:**') || 
              !responseText.includes('**Solution:**') || 
              !responseText.includes('**💡 Tricks & Tips:**')) {
            console.log('Response does not follow template, forcing reformatting...');
            
            const { subject, topic } = detectSubjectAndTopic(userMessage);
            const question = extractQuestion(userMessage);
            
            return {
              role: 'assistant',
              content: createResponseTemplate(subject, topic, question, responseText)
            };
          }
        }
        
        return {
          role: 'assistant',
          content: response.response.text(),
        };
      } catch (error) {
        console.error('Error generating content:', error);
        
        // Only provide template response for educational queries
        const isEducational = detectEducationalQuery(userMessage);
        
        if (isEducational) {
          const { subject, topic } = detectSubjectAndTopic(userMessage);
          const question = extractQuestion(userMessage);
          
          return {
            role: 'assistant',
            content: createResponseTemplate(
              subject, 
              topic, 
              question, 
              'I encountered an error processing your request, but here is some general guidance for this type of question.'
            ),
          };
        } else {
          return {
            role: 'assistant',
            content: 'I encountered an error while generating a response. Please try again or rephrase your question.',
          };
        }
      }
    } catch (error) {
      console.error("Standard API call failed, trying direct fetch fallback:", error);
      const lastMessageText = typeof lastMessage.content === 'string' ? 
        lastMessage.content : 
        JSON.stringify(lastMessage.content);
      
      if ((error as any)?.message?.includes('v1beta')) {
        console.error('API VERSION ERROR: The SDK is trying to use v1beta which is deprecated. Using direct v1 API call as fallback.');
        return await directFetch(lastMessageText);
      }
      
      return await directFetch(lastMessageText);
    }
  } catch (error) {
    console.error('Error in generateResponse:', error);
    return {
      role: 'assistant',
      content: 'I encountered an error while processing your request. Please try again.',
    };
  }
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

// Generate a concept card for educational content
export const generateConceptCard = async (
  query: string
): Promise<Omit<supabaseService.ConceptCard, 'id' | 'created_at'> | null> => {
  try {
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
    
    // Always use gemini-2.0-flash for concept card generation 
    // for better throughput and reliability
    const safeModelId = 'gemini-2.0-flash';
    
    console.log('[CONCEPT CARD] Using model:', safeModelId);
    const model = genAI.getGenerativeModel({ model: safeModelId });
    
    console.log('[CONCEPT CARD] Generating card with model:', safeModelId);
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    console.log('[CONCEPT CARD] Raw response:', response.substring(0, 100) + '...');
    
    // Parse the JSON response
    try {
      // Extract JSON from the response (in case the model includes extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[CONCEPT CARD] No JSON found in response');
        throw new Error('No JSON found in the response');
      }
      
      const jsonText = jsonMatch[0];
      console.log('[CONCEPT CARD] Extracted JSON:', jsonText.substring(0, 100) + '...');
      
      const parsedResult = JSON.parse(jsonText);
      
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
      
      console.log('[CONCEPT CARD] Successfully generated card:', {
        title: parsedResult.title,
        contentPreview: parsedResult.content.substring(0, 50) + '...',
        category: parsedResult.category
      });
      
      return parsedResult;
    } catch (parseError) {
      console.error('[CONCEPT CARD] Error parsing JSON:', parseError, 'Raw response:', response);
      // Fallback to a basic card
      return {
        title: 'Concept from Query',
        content: 'An educational concept related to your query. The AI was unable to format this properly.',
        category: 'Other',
      };
    }
  } catch (error) {
    console.error('[CONCEPT CARD] Error generating concept card:', error);
    return null;
  }
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
  console.log('Converting file to base64:', file.name, file.type, file.size);
  
  if (!file) {
    console.error('No file provided to fileToGenerativePart');
    throw new Error('No file provided');
  }
  
  // Validate file type
  const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validMimeTypes.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Supported types are: ${validMimeTypes.join(', ')}`);
  }
  
  // Create a canvas for image processing
  const img = new Image();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Create a promise to handle image loading
  const imageLoadPromise = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
  
  // Wait for image to load
  await imageLoadPromise;
  
  // Calculate new dimensions while maintaining aspect ratio
  let width = img.width;
  let height = img.height;
  const maxDimension = 768; // Maximum dimension size for optimal token usage
  
  // Scale down if image is too large
  if (width > height && width > maxDimension) {
    height = Math.round((height * maxDimension) / width);
    width = maxDimension;
  } else if (height > maxDimension) {
    width = Math.round((width * maxDimension) / height);
    height = maxDimension;
  }
  
  // Set canvas dimensions
  canvas.width = width;
  canvas.height = height;
  
  // Draw and process image
  ctx.drawImage(img, 0, 0, width, height);
  
  // Convert to base64 with optimal quality
    const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        
        const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        console.log('File converted to base64, length:', result.length);
        resolve(result);
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        reject(new Error('Failed to read file'));
      };
        reader.readAsDataURL(blob);
      },
      file.type, // Use original file type
      0.8 // Quality parameter (0.8 = 80% quality for good balance)
    );
    });
    
    const base64EncodedData = await base64EncodedDataPromise;
    
    // Extract just the base64 data without the data URL prefix
    const base64Data = base64EncodedData.split(',')[1];
    
    if (!base64Data) {
      throw new Error('Failed to extract base64 data from file');
    }
    
  console.log(`Prepared file data: ${file.type}, data length: ${base64Data.length}`);
  
  // Clean up
  URL.revokeObjectURL(img.src);
    
    // This is the exact format Gemini requires for inline images
    return {
      inlineData: {
        data: base64Data,
      mimeType: file.type.split(';')[0] // Remove any charset information
    }
  };
};

export const generateChatTitle = async (content: string): Promise<string> => {
  try {
    console.log('TITLE GENERATION: Starting with content length:', content.length);
    
    // Make a direct API call to Gemini using fetch
    const trimmedContent = content.substring(0, 500); // Limit the content length
    
    // Build a very simple prompt that just asks for a title
    const prompt = `Generate a brief, descriptive chat title (3-5 words max) based on this conversation: "${trimmedContent}"
    The title should be specific to what the conversation is actually about.
    Return ONLY the title text with no quotes, explanation or additional formatting.`;
    
    console.log('TITLE GENERATION: Making direct API call');
    
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
    
    // Make the API call directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
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
      return 'Chat ' + new Date().toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    console.log('TITLE GENERATION: Final title:', title);
    return title;
  } catch (error) {
    console.error('Error generating chat title:', error);
    // Fallback to timestamp title
    return 'Chat ' + new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
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