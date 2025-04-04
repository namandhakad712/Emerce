import * as geminiService from './gemini';
import * as supabaseService from './supabase';
import { v4 as uuidv4 } from 'uuid';

// Categories for concept cards
const VALID_CATEGORIES = [
  'All',
  'Physics', 
  'Chemistry', 
  'Biology', 
  'Science',
  'Technology', 
  'History', 
  'Mathematics', 
  'Art', 
  'Literature', 
  'Philosophy', 
  'Health', 
  'Business', 
  'Other'
];

// Gradients for concept cards
const CARD_GRADIENTS = [
  'from-purple-500 to-indigo-500',
  'from-blue-500 to-teal-500',
  'from-green-500 to-teal-500',
  'from-yellow-500 to-red-500',
  'from-pink-500 to-purple-500',
  'from-indigo-500 to-blue-500',
  'from-red-500 to-pink-500',
  'from-teal-500 to-blue-500',
  // New gradients
  'from-rose-500 to-orange-400',
  'from-emerald-500 to-lime-600',
  'from-sky-500 to-indigo-600',
  'from-amber-400 to-orange-500',
  'from-violet-600 to-indigo-600',
  'from-cyan-400 to-blue-500',
  'from-fuchsia-600 to-pink-600',
  'from-lime-500 to-green-500',
  'from-orange-500 to-red-600',
  'from-blue-400 to-violet-500',
  'from-emerald-400 to-teal-500',
  'from-rose-400 to-pink-600'
];

/**
 * This service automatically generates and saves concept cards from chat messages
 */

/**
 * Pattern matching for educational queries that would benefit from concept cards
 */
export function isEducationalQuery(message: string): boolean {
  // Clean the message
  const cleanedMessage = message.trim().toLowerCase();
  
  // Check for question patterns
  const questionPatterns = [
    /^what (is|are|was|were) /i,
    /^how (does|do|can|could|did) /i,
    /^why (is|are|does|do|did) /i,
    /^explain /i,
    /^describe /i,
    /^tell me about /i,
    /^define /i,
    /can you (explain|describe|tell me about) /i,
    /difference between .* and /i,
    /meaning of /i,
    /definition of /i,
    / vs /i,
    /compared to /i,
    /relationship between /i,
    /purpose of /i,
    /function of /i,
    /example of /i,
    /characteristics of /i,
    /properties of /i,
    /features of /i,
    /aspects of /i,
    /origins of /i,
    /history of /i,
    /concept of /i,
    /theory of /i,
    /significance of /i,
    /importance of /i,
    /applications of /i,
    /uses of /i,
    /types of /i,
    /categories of /i,
    /classification of /i,
    /process of /i,
    /method of /i,
    /technique of /i,
    /approach to /i,
    /basics of /i,
    /fundamentals of /i,
    /principles of /i,
    /rules of /i,
    /guidelines for /i,
    /summary of /i,
    /overview of /i,
    /introduction to /i,
  ];
  
  // Return true if the message matches any educational query pattern
  return questionPatterns.some(pattern => pattern.test(cleanedMessage));
}

/**
 * Extracts the main concept from an educational query
 */
export function extractMainConcept(message: string): string {
  // Clean the message
  const cleanedMessage = message.trim();
  
  // Remove common prefixes
  const withoutPrefix = cleanedMessage
    .replace(/^what (is|are|was|were) /i, '')
    .replace(/^how (does|do|can|could|did) /i, '') 
    .replace(/^why (is|are|does|do|did) /i, '')
    .replace(/^explain /i, '')
    .replace(/^describe /i, '')
    .replace(/^tell me about /i, '')
    .replace(/^define /i, '')
    .replace(/^can you (explain|describe|tell me about) /i, '')
    .replace(/^I want to know about /i, '')
    .replace(/^I'd like to learn about /i, '')
    .replace(/^Could you explain /i, '')
    .replace(/^Please explain /i, '')
    .replace(/^Please tell me about /i, '')
    .replace(/^I'm curious about /i, '')
    .replace(/^I've been wondering about /i, '');
  
  // Extract a reasonable title (first ~50 chars or up to punctuation)
  let title = withoutPrefix;
  
  // Cap at reasonable length
  if (title.length > 60) {
    // Try to cut at a natural break point
    const naturalBreak = title.substring(0, 60).lastIndexOf(' ');
    if (naturalBreak > 30) {
      title = title.substring(0, naturalBreak);
    } else {
      title = title.substring(0, 60);
    }
  }
  
  // Remove trailing punctuation and whitespace
  title = title.replace(/[?,.;:!]$/, '').trim();
  
  // Capitalize first letter
  return title.charAt(0).toUpperCase() + title.slice(1);
}

/**
 * Get a random gradient for concept card styling
 */
export function getRandomGradient(): string {
  return CARD_GRADIENTS[Math.floor(Math.random() * CARD_GRADIENTS.length)];
}

/**
 * Process a set of messages to generate a concept card if appropriate
 */
export async function processMessagesForConceptCard(
  userMessage: supabaseService.ChatMessage,
  aiResponse: supabaseService.ChatMessage
): Promise<supabaseService.ConceptCard | null> {
  try {
    console.log('[CONCEPT CARD] Processing messages for concept card generation');
    
    // Check if the user message is educational
    if (!isEducationalQuery(userMessage.content)) {
      console.log('[CONCEPT CARD] Not an educational query, skipping concept card generation');
      return null;
    }
    
    console.log('[CONCEPT CARD] Educational query detected, attempting concept card generation');
    
    // Extract the main concept for the title
    const conceptTitle = extractMainConcept(userMessage.content);
    
    // Prepare input for the concept card generation
    const userQuery = userMessage.content.trim();
    const aiContent = aiResponse.content.trim();
    
    console.log('[CONCEPT CARD] Generating concept card for:', conceptTitle);
    
    // Generate the concept card directly
    const generatedCard = await generateSimpleConceptCard(conceptTitle, userQuery, aiContent);
    
    if (generatedCard) {
      console.log('[CONCEPT CARD] Successfully generated concept card:', generatedCard.title);
      
      // Save the concept card to the database
      try {
        const savedCard = await supabaseService.addConceptCard(generatedCard);
        console.log('[CONCEPT CARD] Saved to database:', savedCard?.id);
        return savedCard;
      } catch (dbError) {
        console.error('[CONCEPT CARD] Failed to save to database:', dbError);
        return null;
      }
    } else {
      console.log('[CONCEPT CARD] Failed to generate concept card');
      return null;
    }
  } catch (error) {
    console.error('[CONCEPT CARD] Error processing messages for concept card:', error);
    return null;
  }
}

/**
 * Generate a concept card directly from the conversation without API call
 */
async function generateSimpleConceptCard(
  title: string, 
  userQuery: string, 
  aiResponse: string
): Promise<Omit<supabaseService.ConceptCard, 'id' | 'created_at'> | null> {
  try {
    console.log('[CONCEPT CARD] Generating simple concept card for:', title);
    
    // Extract the first 2-3 paragraphs from the AI response
    let content = aiResponse;
    
    // If content is too long, trim it
    if (content.length > 500) {
      // Split by paragraphs
      const paragraphs = content.split(/\n+/);
      
      // Get the first 2-3 meaningful paragraphs
      const usefulParagraphs = paragraphs
        .filter(p => p.trim().length >= 30) // Only substantial paragraphs
        .slice(0, 3); // Take up to 3 paragraphs
      
      content = usefulParagraphs.join('\n\n');
      
      // Final length check and truncation if still too long
      if (content.length > 1000) {
        content = content.substring(0, 997) + '...';
      }
    }
    
    // Try to determine category based on content
    let category = determineCategory(title, userQuery, content);
    
    // Fallback to direct model call for better card generation
    if (title && content) {
      try {
        const modelGenerated = await geminiService.generateConceptCard(title);
        
        // If the model returned a valid result, use it
        if (modelGenerated) {
          console.log('[CONCEPT CARD] Using model-generated concept card');
          return modelGenerated;
        }
      } catch (modelError) {
        console.error('[CONCEPT CARD] Model-based generation failed:', modelError);
        // Continue with simple generation since model failed
      }
      
      // If we reached here, either we're using the simple generation or model generation failed
      console.log('[CONCEPT CARD] Using simple concept card generation');
      
      return {
        title: title,
        content: content,
        category: category,
        color_gradient: getRandomGradient()
      };
    }
    
    return null;
  } catch (error) {
    console.error('[CONCEPT CARD] Error generating simple concept card:', error);
    return null;
  }
}

/**
 * Determine the category of a concept based on its content
 */
function determineCategory(title: string, query: string, content: string): supabaseService.ConceptCard['category'] {
  // Combine all text for analysis
  const allText = `${title} ${query} ${content}`.toLowerCase();
  
  // Simple keyword matching for categories
  const categoryKeywords: Record<string, string[]> = {
    'Physics': ['physics', 'mechanics', 'gravity', 'force', 'energy', 'motion', 'velocity', 'acceleration', 'momentum', 'quantum', 'relativity', 'electromagnetics', 'thermodynamics', 'optics', 'acoustics', 'nuclear'],
    'Chemistry': ['chemistry', 'chemical', 'element', 'compound', 'reaction', 'molecule', 'acid', 'base', 'organic', 'inorganic', 'pH', 'bond', 'atom', 'solution', 'catalyst', 'gas', 'liquid', 'solid'],
    'Biology': ['biology', 'organism', 'cell', 'gene', 'dna', 'species', 'evolution', 'ecosystem', 'plant', 'animal', 'human', 'anatomy', 'physiology', 'ecology', 'microbiology', 'virus', 'bacteria', 'photosynthesis'],
    'Science': ['science', 'scientific', 'study', 'research', 'experiment', 'laboratory', 'hypothesis', 'theory', 'evidence', 'data', 'observation', 'environment', 'natural', 'measurement', 'analysis'],
    'Technology': ['technology', 'computer', 'software', 'hardware', 'internet', 'digital', 'app', 'web', 'code', 'program', 'algorithm', 'data', 'network', 'cyber', 'virtual', 'online', 'device', 'gadget', 'robot', 'ai', 'artificial intelligence', 'machine learning'],
    'History': ['history', 'historical', 'ancient', 'medieval', 'modern', 'century', 'war', 'revolution', 'civilization', 'empire', 'kingdom', 'monarch', 'president', 'leader', 'movement', 'era', 'period', 'decade', 'past', 'timeline'],
    'Mathematics': ['math', 'mathematics', 'algebra', 'geometry', 'calculus', 'arithmetic', 'statistics', 'probability', 'equation', 'number', 'formula', 'function', 'variable', 'constant', 'theorem', 'proof', 'calculation', 'computation', 'mathematical', 'trigonometry'],
    'Art': ['art', 'artistic', 'painting', 'sculpture', 'drawing', 'photography', 'design', 'visual', 'aesthetic', 'creative', 'museum', 'gallery', 'artist', 'artwork', 'masterpiece', 'composition', 'color', 'style', 'beauty', 'expression'],
    'Literature': ['literature', 'book', 'novel', 'poem', 'poetry', 'story', 'author', 'writer', 'character', 'plot', 'narrative', 'theme', 'literary', 'fiction', 'nonfiction', 'genre', 'prose', 'verse', 'publication', 'text'],
    'Philosophy': ['philosophy', 'philosopher', 'ethics', 'moral', 'logic', 'reason', 'thought', 'idea', 'concept', 'theory', 'perspective', 'view', 'belief', 'existence', 'meaning', 'truth', 'knowledge', 'wisdom', 'consciousness', 'mind'],
    'Health': ['health', 'medical', 'medicine', 'disease', 'condition', 'symptom', 'treatment', 'therapy', 'doctor', 'nurse', 'patient', 'hospital', 'clinic', 'wellness', 'fitness', 'nutrition', 'diet', 'exercise', 'body', 'mental health'],
    'Business': ['business', 'economics', 'economy', 'finance', 'market', 'investment', 'company', 'corporation', 'industry', 'trade', 'commerce', 'management', 'leadership', 'entrepreneur', 'startup', 'profit', 'revenue', 'strategy', 'organization', 'commercial']
  };
  
  // Count keyword matches for each category
  const categoryCounts: Record<string, number> = {};
  
  // Initialize with zero
  VALID_CATEGORIES.forEach(cat => {
    categoryCounts[cat] = 0;
  });
  
  // Count matches
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    keywords.forEach(keyword => {
      if (allText.includes(keyword)) {
        categoryCounts[category] += 1;
      }
    });
  }
  
  // Find category with most matches
  let bestCategory = 'Other';
  let highestCount = 0;
  
  for (const [category, count] of Object.entries(categoryCounts)) {
    if (count > highestCount) {
      highestCount = count;
      bestCategory = category;
    }
  }
  
  // Check if this is a match for Physics, Chemistry, Biology, or Other - to match the UI categories
  const uiCategories = ['Physics', 'Chemistry', 'Biology', 'Other'] as const;
  if (!uiCategories.includes(bestCategory as any)) {
    // For Science-related topics, map them appropriately
    if (['Science', 'Technology', 'Mathematics'].includes(bestCategory)) {
      if (categoryCounts['Physics'] > 1) return 'Physics';
      if (categoryCounts['Chemistry'] > 1) return 'Chemistry';
      if (categoryCounts['Biology'] > 1) return 'Biology';
      return 'Physics'; // Default science category if no specific match
    } else {
      return 'Other'; // For non-science topics
    }
  }
  
  // Return the chosen category with proper capitalization
  return bestCategory as supabaseService.ConceptCard['category'];
}

export default {
  isEducationalQuery,
  extractMainConcept,
  processMessagesForConceptCard,
  getRandomGradient
}; 