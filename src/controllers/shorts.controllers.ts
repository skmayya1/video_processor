import { AiResponse, Word } from "../types";

interface ShortWithDuration extends AiResponse {
    from: number;
    to: number;
}

// Helper function to clean text more aggressively
const cleanText = (text: string): string => {
    return text
        .replace(/[.,!?"'\-:;()\[\]{}]/g, "") // Remove more punctuation
        .replace(/\s+/g, " ") // Normalize whitespace
        .toLowerCase()
        .trim();
};

// Helper function to calculate similarity between two strings
const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = cleanText(str1);
    const s2 = cleanText(str2);
    
    // If strings are identical after cleaning, return 1
    if (s1 === s2) return 1;
    
    // Calculate Levenshtein distance
    const matrix = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(0));
    
    for (let i = 0; i <= s1.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    
    const distance = matrix[s1.length][s2.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - distance / maxLength;
};

export const getShortDurations = (
    shortContents: AiResponse[],
    words: Word[]
): ShortWithDuration[] => {
    return shortContents.map((short) => {
        const cleanedHighlight = cleanText(short.highlightText).split(/\s+/);
        const cleanedWords = words.map(w => cleanText(w.text));
        
        let bestMatch = {
            startIndex: -1,
            similarity: 0,
            length: 0
        };
        
        // Try different window sizes around the expected length
        const minLength = Math.max(3, cleanedHighlight.length - 2);
        const maxLength = cleanedHighlight.length + 2;
        
        for (let windowSize = minLength; windowSize <= maxLength; windowSize++) {
            for (let i = 0; i <= cleanedWords.length - windowSize; i++) {
                const window = cleanedWords.slice(i, i + windowSize).join(" ");
                const highlight = cleanedHighlight.join(" ");
                const similarity = calculateSimilarity(window, highlight);
                
                if (similarity > bestMatch.similarity && similarity > 0.8) { // 80% similarity threshold
                    bestMatch = {
                        startIndex: i,
                        similarity,
                        length: windowSize
                    };
                }
            }
        }
        
        if (bestMatch.startIndex === -1) {
            console.warn("Could not find timestamp for short:", short.title);
            return {
                ...short,
                from: 0,
                to: 0,
            };
        }
        
        const from = words[bestMatch.startIndex].start / 1000;
        const to = words[bestMatch.startIndex + bestMatch.length - 1].end / 1000;
        
        return {
            ...short,
            from: parseFloat(from.toFixed(2)),
            to: parseFloat(to.toFixed(2)),
        };
    });
};