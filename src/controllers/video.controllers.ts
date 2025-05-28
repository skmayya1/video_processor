import { AiResponse, ProjectDetails } from "../types";
import cloudinary from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface ProcessedShort extends AiResponse {
    videoUrl: string;
    processingTime?: number;
}

export const generateAndStoreShorts = async (
    ShortsTranscripts: AiResponse[], 
    Config: ProjectDetails, 
    publicId: string
): Promise<ProcessedShort[]> => {
    console.log(ShortsTranscripts,Config,publicId);
    
    console.log(`Processing ${ShortsTranscripts.length} shorts for publicId: ${publicId}`);
    console.log('Config:', Config);

    const getDimensions = (aspectRatio: string) => {
        switch (aspectRatio) {
            case "16:9":
                return { width: 1920, height: 1080 };
            case "9:16":
                return { width: 1080, height: 1920 };
            case "1:1":
                return { width: 1080, height: 1080 };
            default:
                console.warn(`Unknown aspect ratio: ${aspectRatio}, defaulting to 16:9`);
                return { width: 1920, height: 1080 };
        }
    };

    const dimensions = getDimensions(Config.aspectRatio);

    const results = await Promise.all(
        ShortsTranscripts.map(async (short, index) => {
            const startTime = Date.now();
            
            try {
                // Validate time offsets
                if (typeof short.from !== 'number' || typeof short.to !== 'number') {
                    throw new Error(`Invalid duration for short: ${short.title} - from: ${short.from}, to: ${short.to}`);
                }

                if (short.from < 0 || short.to <= short.from) {
                    throw new Error(`Invalid time range for short: ${short.title} - from: ${short.from}s, to: ${short.to}s`);
                }

                // Generate transformation parameters
                const transformation = [
                    {
                        start_offset: `${short.from}s`, // Explicitly specify seconds
                        end_offset: `${short.to}s`,
                        width: dimensions.width,
                        height: dimensions.height,
                        crop: "fill", // Consider using "fill" instead of "scale" to maintain aspect ratio
                        gravity: "center", // Center the crop if using "fill"
                        quality: "auto:good", // Optimize quality
                        format: "mp4" // Ensure consistent format
                    }
                ];

                const videoUrl = cloudinary.v2.url(publicId, {
                    resource_type: "video",
                    transformation,
                    secure: true // Use HTTPS
                });

                if (!videoUrl) {
                    throw new Error(`Failed to generate URL for short: ${short.title}`);
                }
                
                const processingTime = Date.now() - startTime;
                console.log(`✅ Generated video URL for "${short.title}" (${index + 1}/${ShortsTranscripts.length}) - ${processingTime}ms`);
                
                return {
                    ...short,
                    videoUrl,
                    processingTime
                } as ProcessedShort;

            } catch (error) {
                const processingTime = Date.now() - startTime;
                console.error(`❌ Error processing short "${short.title}" (${index + 1}/${ShortsTranscripts.length}) - ${processingTime}ms:`, error);
                throw new Error(`Failed to process short "${short.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        })
    );

    console.log(`🎉 Successfully processed ${results.length} shorts`);
    return results;
};

