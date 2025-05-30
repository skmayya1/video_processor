import { Socket } from "socket.io";

export interface ServerToClientEvents {
  update: (data: string) => void;
  status: (status: "queued" | "processing" | "done" | "error") => void;
}

export interface ClientToServerEvents {
  joinRoom: (roomId: string) => void;
  startJob: (videoId: string) => void;
}

export interface Word {
    start: number;
    end: number;
    text: string;
    confidence?: number;
    speaker?: string;
  }

  export interface TranscriptData {
    projectId: string;
    videoId?: string;
    pub_id?: string;
    cloudinaryUrl?: string;
    text: string;
    summary: string;
    words: Word[];
  }


export  interface ProjectDetails {
    genre: string;
    clipLength: {
      from: number | 'auto';
      to: number | 'auto';
    };
    keywords: string;
    timeframe: {
      from: number;
      to: number;
    };
    aspectRatio: "16:9" | "1:1" | "9:16";
    shortsCount: number;
    title: string;
    description: string;
    thumbnail: string;
    channelTitle: string;
    duration: string;
    videoId: string;
  }

 export  interface AiResponse {
    label: string;
    title: string;
    highlightText: string;
    mood: string;
    reason: string;
    from?: number;
    to?: number;
  }


  

export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
