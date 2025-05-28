import { AiResponse, ProjectDetails } from "../types";
import ai from "../gemini";

const systemInstruction = `You are an expert video editor and content strategist for short-form videos (YouTube Shorts, Reels, TikToks).

Your job is to extract the most engaging, genre-appropriate clips from a long transcript, based on the user's preferences.

Use the user configuration and the transcript below to suggest short-form video clips.

IMPORTANT RULES FOR TEXT EXTRACTION:
1. The "highlightText" MUST be an EXACT quote from the transcript - do not modify, rephrase, or change any words
2. Copy and paste the exact text from the transcript, including the context and the main moment
3. Do not add or remove any words from the original transcript
4. If you need to include punctuation, use exactly what's in the transcript
5. The highlightText should be long enough to include both the setup and the payoff (at least 5-10 seconds of context)

Notes:
- If the transcript is too short or lacks enough engaging moments, return fewer than the requested number of clips
- Prioritize quality over quantity — each clip should be able to stand alone and engage the viewer
- If user keywords are not found in the transcript, fall back to identifying moments that fit the genre or tone

---

User Configuration:
- Genre: {{genre}} 
- Keywords to highlight: {{keywords}}
- Number of shorts requested: {{shortsCount}} (this is the maximum number of shorts transcription you can return)

Video Metadata:
- Title: "{{title}}"
- Description: "{{description}}"

Transcript:
{{transcript}}

---

For each clip, return an object with:
- label: Short description of the moment (max 6 words)
- title: Catchy title for the short (max 60 characters)
- highlightText: EXACT quote from transcript that includes both the context (setup) and the main moment
- mood: Emotional tone (e.g., funny, sad, intense, awkward)
- reason: Why this clip is worth highlighting (e.g., fits genre, matches keyword, emotionally strong, viral potential)

Return up to {{shortsCount}} clips in a JSON array. Do not force quantity — prioritize quality.`;

export const gernerateShorts = async (transcript: string, config: ProjectDetails) => {
  const { genre, keywords, shortsCount, title, description } = config;

  const prompt = systemInstruction
    .replace("{{genre}}", genre)
    .replace("{{keywords}}", keywords.trim())
    .replace("{{shortsCount}}", shortsCount.toString())
    .replace("{{title}}", title)
    .replace("{{description}}", description)
    .replace("{{transcript}}", transcript);

  try {
    const res = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ text: prompt }]
    });
    
    console.log("Raw AI Response:", res.text);

    if (!res.text) {
      throw new Error("Empty response from AI");
    }

    // Clean the response text
    let cleanedText = res.text
      .replace(/```json|```/g, "") // Remove markdown code blocks
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
      .replace(/\n\s*\n/g, "\n") // Remove multiple newlines
      .trim();

    // Try to find JSON array in the text
    const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }

    try {
      const ShortsTranscripts: AiResponse[] = JSON.parse(cleanedText);
      console.log(`Successfully parsed ${ShortsTranscripts.length} shorts`);
      return ShortsTranscripts;
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Problematic text:", cleanedText);
      throw new Error("Failed to parse AI response as JSON");
    }
  } catch (error) {
    console.error("Error in generateShorts:", error);
    throw error;
  }
};
