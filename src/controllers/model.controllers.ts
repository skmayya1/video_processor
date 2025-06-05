import { AiResponse, ProjectDetails } from "../types";
import ai from "../gemini";

interface Resp extends AiResponse {
  viralPotential: string
  estimatedDuration:number
}

const systemInstruction = `You are an expert viral content strategist and short-form video editor with deep knowledge of YouTube Shorts, TikTok, and Instagram Reels algorithms.

Your expertise includes:
- Understanding viral psychology and engagement triggers
- Platform-specific optimization (YouTube Shorts vs TikTok vs Instagram Reels)
- Audience retention patterns and drop-off points
- Current trending formats and viral mechanics
- Hook psychology and attention-grabbing techniques

VIRAL MECHANICS ANALYSIS:
Before extracting clips, analyze the content for these viral elements:
1. PATTERN INTERRUPTS: Unexpected moments, contradictions, or surprises
2. EMOTIONAL PEAKS: High-energy moments, conflicts, breakthroughs, or revelations
3. RELATABILITY FACTORS: Universal experiences, common struggles, shared frustrations
4. CONTROVERSIAL TAKES: Contrarian opinions, hot takes, or debate-worthy statements
5. EDUCATIONAL MOMENTS: Clear value delivery, "aha" moments, or skill demonstrations
6. STORYTELLING ARCS: Complete narratives with setup, conflict, and resolution
7. PERSONALITY MOMENTS: Authentic reactions, vulnerable shares, or charismatic delivery

CLIP OPTIMIZATION FRAMEWORK:

HOOK STRUCTURE (First 3-5 seconds):
- Start mid-action or mid-sentence when possible
- Lead with the most compelling part, then provide context
- Use pattern interrupts: "Wait, what?", "This changes everything", "Nobody talks about..."
- Include emotional hooks: shock, curiosity, controversy, or immediate value

RETENTION STRATEGY (Throughout clip):
- Maintain forward momentum with teases: "But here's what's crazy...", "Wait until you hear this..."
- Include visual or verbal payoffs every 8-12 seconds
- End with strong closure or cliffhanger for engagement

PLATFORM-SPECIFIC CONSIDERATIONS:
- YouTube Shorts: Favor educational/informational content, clear value propositions
- TikTok: Prioritize entertainment, trends, personality-driven content
- Instagram Reels: Balance of aesthetic appeal and engaging content

CLIP SELECTION CRITERIA:
Each clip MUST have:
✓ A hook that works within first 3 seconds
✓ Clear value or entertainment throughout
✓ Natural conversation flow with complete context
✓ Quotable moments that invite comments/shares
✓ Content that aligns with {{genre}} audience expectations
✓ Potential for multiple views/rewatches

QUALITY THRESHOLDS:
- Minimum viral potential score: 6/10
- Must contain complete thought/exchange (no mid-sentence cuts)
- Should answer a question, solve a problem, or entertain
- Must feel satisfying as a standalone piece

CONTENT EXTRACTION RULES:
1. "highlightText" = EXACT transcript quotes (zero modifications)
2. Include natural pauses, reactions, and conversational flow
3. Capture content between 10-60 seconds (flexible based on content quality)
4. Ensure each clip has proper setup → main content → payoff structure
5. Prioritize moments with immediate engagement potential

Target: Generate exactly {{shortsCount}} clips as requested by the user.`;

export const generateShorts = async (transcript: string, config: ProjectDetails): Promise<AiResponse[]> => {
  const { genre, keywords, shortsCount, title, description, clipLength } = config;
  
  
  if (!transcript.trim()) {
    throw new Error("Transcript is empty or invalid");
  }
  
  if (transcript.length < 200) {
    console.warn("Transcript is very short, may produce limited results");
  }

  // Use the exact user input for shorts count without restrictions
  const requestedCount = shortsCount || 2; // Default to 5 if not provided
  
  // Determine clip length range
  const clipRange = clipLength && clipLength.from && clipLength.to 
    ? `${clipLength.from} to ${clipLength.to} seconds`
    : "10 to 60 seconds";
  
  const clipDurationMin = clipLength?.from || 10;
  const clipDurationMax = clipLength?.to || 60;
  
  const humanPrompt = `
MISSION: Extract exactly ${requestedCount} viral short clips from this ${genre} content that will maximize views, engagement, and shares.

CONTENT ANALYSIS:
Title: "${title}"
Genre: ${genre}
Keywords: ${keywords}
Description: ${description}
Clip Length: ${clipRange}

VIRAL EXTRACTION STRATEGY:
1. First, scan the transcript for these high-performing elements:
   - Contradictory or surprising statements
   - Emotional peak moments (anger, excitement, revelation)
   - Educational breakthroughs or "aha" moments  
   - Controversial or debate-worthy opinions
   - Relatable struggles or universal experiences
   - Story climaxes or dramatic reveals
   - Funny exchanges with proper setup + punchline

2. For each potential clip, evaluate:
   - Hook strength (first 3 seconds engagement potential)
   - Retention factors (reasons to keep watching)
   - Shareability (quotable, comment-worthy content)
   - Completion satisfaction (feels complete as standalone)
   - Rewatch value (layers of meaning or entertainment)

3. Prioritize clips that:
   - Start with immediate intrigue or value
   - Deliver on the initial promise
   - Leave viewers wanting to engage (comment/share)
   - Fit current ${genre} trending formats

EXTRACTION REQUIREMENTS:
- Extract EXACT text from transcript (no modifications)
- Include sufficient context (setup + main moment + resolution)
- Aim for clips between ${clipDurationMin}-${clipDurationMax} seconds (flexible based on content quality)
- Ensure natural conversation flow
- Each clip must be independently engaging
- Return exactly ${requestedCount} clips as requested

OUTPUT FORMAT (JSON array):
[
  {
    "label": "Hook description (4-8 words, action-oriented)",
    "title": "Viral-ready title (45-70 chars, emotional trigger + value)",
    "highlightText": "EXACT transcript excerpt (complete thoughts only)",
    "startContext": "What happens right before this moment",
    "mood": "Primary emotion (shocking/funny/inspiring/controversial/educational)",
    "viralPotential": "Score 1-10 with reasoning",
    "reason": "Specific viral mechanics: why this will perform (trend alignment, emotional impact, shareability factor)",
    "suggestedHook": "First 3-5 words to grab attention",
    "estimatedDuration": "Seconds (${clipDurationMin}-${clipDurationMax} range)",
    "engagementTriggers": ["List of specific elements that drive engagement"],
    "targetAudience": "Who will this resonate with most",
    "contentType": "educational/entertainment/inspirational/controversial"
  }
]

IMPORTANT: Return exactly ${requestedCount} clips with durations between ${clipDurationMin}-${clipDurationMax} seconds. Prioritize quality while meeting the exact count requested.

TRANSCRIPT TO ANALYZE:
${transcript}

Focus on moments that make viewers stop scrolling, rewatch, and share with friends. What would make someone say "You have to see this!"?`;

  try {
    
    const res = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ text: humanPrompt }],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        topK: 40,
        topP: 0.85,
        maxOutputTokens: 4000,
      }
    });
    
    console.log("AI analysis complete, processing viral clips...");

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
      const rawClips: Resp[] = JSON.parse(jsonArray);

      
      const viralClips = rawClips.filter(clip => {
        if (!clip.viralPotential) return false;
        
        const score = typeof clip.viralPotential === 'string' 
          ? parseInt(clip.viralPotential.split('/')[0]) 
          : clip.viralPotential;
        
        const duration = typeof clip.estimatedDuration === 'string' 
          ? parseInt(clip.estimatedDuration) 
          : clip.estimatedDuration;

        
        return score >= 5 
      });
      
      
      if (viralClips.length > requestedCount) {
        const sortedClips = viralClips.sort((a, b) => {
          const scoreA = typeof a.viralPotential === 'string' 
            ? parseInt(a.viralPotential.split('/')[0]) 
            : a.viralPotential;
          const scoreB = typeof b.viralPotential === 'string' 
            ? parseInt(b.viralPotential.split('/')[0]) 
            : b.viralPotential;
          return scoreB - scoreA;
        });
        return sortedClips.slice(0, requestedCount);
      }
      
      if (viralClips.length < requestedCount) {
        console.warn(`Only found ${viralClips.length} quality clips, requested ${requestedCount}`);
      }
      
      return viralClips;
      
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