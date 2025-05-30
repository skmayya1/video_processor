import { AiResponse, ProjectDetails } from "../types";
import ai from "../gemini";

const systemInstruction = `You are an expert video editor and content strategist specializing in viral short-form videos (YouTube Shorts, Reels, TikToks).

Your mission is to identify the most engaging, shareable moments from long-form content and craft them into compelling short clips that maximize viewer retention and engagement.

CLIP LENGTH REQUIREMENTS:
- Each clip should be 15-60 seconds long (aim for 30-45 seconds for optimal engagement)
- Include sufficient context: setup (5-10 seconds) + main moment + payoff/reaction
- Ensure each clip tells a complete micro-story that hooks viewers immediately

CONTENT EXTRACTION RULES:
1. "highlightText" MUST be EXACT quotes from the transcript - no modifications whatsoever
2. Include natural conversation flow with pauses, reactions, and context
3. Capture complete thoughts/exchanges, not fragmented sentences
4. Look for moments with:
   - Strong emotional hooks in the first 3 seconds
   - Conflict, tension, or surprise elements
   - Relatable or controversial statements
   - Educational insights with "aha" moments
   - Funny exchanges with proper setup and punchline
   - Dramatic reveals or plot twists

OPTIMIZATION STRATEGY:
- Prioritize moments that create immediate curiosity or emotional response
- Look for quotable moments that spark comments and shares
- Identify content that fits current trends in the {{genre}} space
- Find moments that answer common questions or address popular topics
- Seek controversy or unique perspectives (appropriate to content type)

QUALITY OVER QUANTITY:
- Generate minimum 1 clip, maximum {{shortsCount}} clips
- Only suggest clips that have genuine viral potential
- Each clip must be able to standalone and engage viewers completely
- If transcript lacks engaging moments, return fewer high-quality clips

---

User Configuration:
- Genre: {{genre}}
- Target Keywords: {{keywords}}
- Maximum clips requested: {{shortsCount}}
- Content Focus: {{contentFocus}}

Video Source:
- Title: "{{title}}"
- Description: "{{description}}"

Full Transcript:
{{transcript}}

---

RESPONSE FORMAT:
For each clip, provide:
- label: Hook description (4-8 words, action-oriented)
- title: Viral-ready title (45-60 chars, includes emotional trigger)
- highlightText: EXACT transcript excerpt (15-60 seconds worth of content)
- startContext: Brief setup before the main moment
- mood: Primary emotion (funny, shocking, inspiring, controversial, educational, dramatic)
- viralPotential: Score 1-10 with brief explanation
- reason: Why this specific moment will perform well (trend alignment, emotional impact, shareability)
- suggestedHook: First 3-5 words to grab attention immediately
  - estimatedDuration: Approximate clip length in seconds

Return a JSON array with your top recommendations, ordered by viral potential (highest first).`;

export const generateShorts = async (transcript: string, config: ProjectDetails): Promise<AiResponse[]> => {
  const { genre, keywords, shortsCount, title, description } = config;
  
  if (!transcript.trim()) {
    throw new Error("Transcript is empty or invalid");
  }
  
  if (transcript.length < 200) {
    console.warn("Transcript is very short, may produce limited results");
  }

  const requestedCount = Math.min(Math.max(shortsCount, 1), 10);
  

  const humanPrompt = `
  TASK: Extract ${requestedCount} viral short-form video clips from the transcript below.
  
  CONTENT TYPE: ${genre}
  TARGET KEYWORDS: ${keywords}
  SOURCE VIDEO: "${title}"
  DESCRIPTION: ${description}
  
  REQUIREMENTS:
  - Generate 1-${requestedCount} clips (quality over quantity)
  - Each clip must be 15-60 seconds long (aim for 30-45 seconds)
  - Include complete context: setup + main moment + payoff
  - Extract EXACT text from transcript - no modifications
  - Focus on moments with immediate hook potential
  - Prioritize ${genre}-specific engaging content
  
  WHAT MAKES A GREAT CLIP:
  - Strong emotional hook in first 3 seconds
  - Complete story arc with natural flow
  - Quotable moments that spark engagement
  - Fits current ${genre} trends and audience expectations
  - Contains setup, conflict/tension, and resolution
  
  FORMAT: Return JSON array with objects containing:
  - label: Hook description (4-8 words)
  - title: Viral title (45-60 characters)
  - highlightText: EXACT transcript quote (minimum 50 words)
  - mood: Primary emotion
  - reason: Why this will perform well
  - viralPotential: Score 1-10
  
  TRANSCRIPT:
  ${transcript}
  
  Focus on moments that viewers will want to share, comment on, or watch multiple times.`;


  try {
    console.log(`Generating shorts for ${genre} content with ${requestedCount} max clips...`);
    
    const res = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ text: humanPrompt }],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 4000,
      }
    });
    
    console.log("Raw AI Response received, processing...");

    if (!res.text) {
      throw new Error("Empty response from AI");
    }

    let cleanedText = res.text
      .replace(/```json|```javascript|```/g, "")
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    let jsonArray: string | null = null;

    const arrayMatch = cleanedText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonArray = arrayMatch[0];
    } else {
      const betweenBraces = cleanedText.match(/\{[\s\S]*\}/);
      if (betweenBraces) {
        jsonArray = `[${betweenBraces[0]}]`;
      }
    }
    if (!jsonArray) {
      throw new Error("No valid JSON structure found in AI response");
    }
    try {
      const rawClips: AiResponse[] = JSON.parse(jsonArray);
        return rawClips;
      
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Problematic JSON:", jsonArray?.substring(0, 500) + "...");
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
    }
    
  } catch (error) {
    console.error("Error in generateShorts:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("quota") || error.message.includes("rate limit")) {
        throw new Error("AI service quota exceeded. Please try again later.");
      } else if (error.message.includes("network") || error.message.includes("connection")) {
        throw new Error("Network error. Please check your connection and try again.");
      }
    }
    throw error;
  }
};

