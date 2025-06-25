import React, { use, useCallback, useEffect, useRef, useState } from "react";
import { RealtimeClient } from "@openai/realtime-api-beta";
import { SimliClient } from "simli-client";
import VideoBox from "./Components/VideoBox";
import cn from "./utils/TailwindMergeAndClsx";
import IconExit from "@/media/IconExit";
import IconSparkleLoader from "@/media/IconSparkleLoader";
import { on } from "events";
import VideoPopupPlayer from "./Components/video-player";




interface SimliOpenAIProps {
  simli_faceid: string;
  openai_voice: "alloy"|"ash"|"ballad"|"coral"|"echo"|"sage"|"shimmer"|"verse";
  openai_model: string;
  initialPrompt: string;
  onStart: () => void;
  onClose: () => void;
  showDottedFace: boolean;
}

const simliClient = new SimliClient();

const SimliOpenAI: React.FC<SimliOpenAIProps> = ({
  simli_faceid,
  openai_voice,
  openai_model,
  initialPrompt,
  onStart,
  onClose,
  showDottedFace,
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isAvatarVisible, setIsAvatarVisible] = useState(false);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [userMessage, setUserMessage] = useState("...");
  const [showPopup, setShowPopup] = useState(false);
  const [videoName, setVideoName] = useState<string | null>(null);  
  const [email, setEmail] = useState("");
  const [userid, setUserId] = useState("questions");
  const [ticket_number, setTicketNumber] = useState("");
  const [appointment_date, setAppointmentDate] = useState("");
  const [appointment_time, setAppointmentTime] = useState("");
  const [doctor_name, setDoctorName] = useState("");
  const [patient_name, setPatientName] = useState("");
  const [patient_id, setPatientId] = useState("");
  const [counter_number, setCounterNumber] = useState("");  
  const [user_transcript, setUserTranscript] = useState("");
  const [avatar_transcript, setAvatarTranscript] = useState("");

const emailRef = useRef(email);
const useridRef = useRef(userid);
const ticketNumberRef = useRef(ticket_number);
const appointmentDateRef = useRef(appointment_date);
const appointmentTimeRef = useRef(appointment_time);
const doctorNameRef = useRef(doctor_name);
const patientNameRef = useRef(patient_name);
const patientIdRef = useRef(patient_id);
const counterNumberRef = useRef(counter_number);
const userTranscriptRef = useRef(user_transcript);
const avatarTranscriptRef = useRef(avatar_transcript);

// Update refs whenever the corresponding state changes
useEffect(() => {
  emailRef.current = email;
}, [email]);

useEffect(() => {
  userTranscriptRef.current = userMessage;
}, [userMessage]);

useEffect(() => {
  avatarTranscriptRef.current = avatar_transcript;
}, [avatar_transcript]);

useEffect(() => {
  useridRef.current = userid;
}, [userid]);

useEffect(() => {
  ticketNumberRef.current = ticket_number;
}, [ticket_number]);

useEffect(() => {
  appointmentDateRef.current = appointment_date;
}, [appointment_date]);

useEffect(() => {
  appointmentTimeRef.current = appointment_time;
}, [appointment_time]);

useEffect(() => {
  doctorNameRef.current = doctor_name;
}, [doctor_name]);

useEffect(() => {
  patientNameRef.current = patient_name;
}, [patient_name]);

useEffect(() => {
  patientIdRef.current = patient_id;
}, [patient_id]);

useEffect(() => {
  counterNumberRef.current = counter_number;
}, [counter_number]);

  const handleEmailSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  console.log("Submitted email:", emailRef.current);
  // Add your submission logic here
};

  // Refs for various components and states
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const openAIClientRef = useRef<RealtimeClient | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isFirstRun = useRef(true);

  // New refs for managing audio chunk delay
  const audioChunkQueueRef = useRef<Int16Array[]>([]);
  const isProcessingChunkRef = useRef(false);

  /**
   * Initializes the Simli client with the provided configuration.
   */
  const initializeSimliClient = useCallback(() => {
    if (videoRef.current && audioRef.current) {
      const SimliConfig = {
        apiKey: process.env.NEXT_PUBLIC_SIMLI_API_KEY,
        faceID: simli_faceid,
        handleSilence: true,
        maxSessionLength: 30600, // in seconds
        maxIdleTime: 30600, // in seconds
        videoRef: videoRef.current,
        audioRef: audioRef.current,
        enableConsoleLogs: true,
      };

      simliClient.Initialize(SimliConfig as any);
      console.log("Simli Client initialized");
    }
  }, [simli_faceid]);


  


  /**
   * Initializes the OpenAI client, sets up event listeners, and connects to the API.
   */
  const initializeOpenAIClient = useCallback(async () => {
    try {
      console.log("Initializing OpenAI client...");
      openAIClientRef.current = new RealtimeClient({
        model: openai_model,
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
        dangerouslyAllowAPIKeyInBrowser: true,
      });

      await openAIClientRef.current.updateSession({
        instructions: initialPrompt,
        voice: openai_voice,
        turn_detection: { type: "server_vad" },
        input_audio_transcription: { model: "whisper-1" },
      });

      // --------- TOOLS ----------

      // Fetches all the questions for the given userid
      openAIClientRef.current.addTool(
  {
    name: 'get_user_detail',
    description: `Fetches the user NAME AND PATIENT ID for the current user using the email - ${emailRef.current}. This is used to schedule the appointment for the user.`,
    parameters: {
      type: 'object',
      properties: {}, // No external input required
    },
    
  },
  async () => {
    const result = await fetch("https://holoagent.app.n8n.cloud/webhook/userdetailsexp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email:emailRef.current }), // Accessing from component state
    });
    console.log("Using email:", emailRef.current);
    const json = await result.text();
    return json;
  }
);



      // Scores the user after the interview is finished
      openAIClientRef.current.addTool(
        {
          name: 'finalize_appointment',
          description:
            'Schedules the appointment for the user after the user requirement is clear and conversation is finished.',
          parameters: {
            type: 'object',
            properties: {
              ticket_number: {
                type: 'string',
                description: 'Randomly generated ticket number for the user. Example: 123456',
              },
              appointment_date: {
                type: 'string',
                description: 'The date of the appointment scheduled for the user.',
              },
              appointment_time: {
                type: 'string',
                description: 'The time of the appointment scheduled for the user.',
              },
              doctor_name: {
                type: 'string',
                description: 'The name of the doctor assigned to the user. Options: Dr. Smith, Dr. Johnson, and Dr. Rajesh Gupta',
              },
              patient_name: {
                type: 'string',
                description: 'The name of the patient for whom the appointment is scheduled.',
              },
              patient_id: {
                type: 'string',
                description: 'The ID of the patient for whom the appointment is scheduled. ',
              },
              counter_number: {
                type: 'string',
                description: 'Randomly generated counter number for the appointment. Example: 1A, 2B, etc.',
              },
            },
            required: ['ticket_number','appointment_date','appointment_time','doctor_name'],
          },
        },
        async ({ ticket_number, appointment_date, appointment_time, doctor_name, patient_name, patient_id, counter_number }: { ticket_number: string, appointment_date: string, appointment_time: string, doctor_name: string, patient_name: string, patient_id: string, counter_number: string }) => {

          // Update the refs with the latest values
          ticketNumberRef.current = ticket_number;
          appointmentDateRef.current = appointment_date;
          appointmentTimeRef.current = appointment_time;
          doctorNameRef.current = doctor_name;
          patientNameRef.current = patient_name;
          patientIdRef.current = patient_id;
          counterNumberRef.current = counter_number;

          console.log("Finalizing appointment with details:", {
            ticket_number,
            appointment_date,
            appointment_time,
            doctor_name,
            patient_name,
            patient_id,
            counter_number,
          });

          const result = await fetch("https://holoagent.app.n8n.cloud/webhook/finalizeappointment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ticket_number: ticketNumberRef.current, appointment_date: appointmentDateRef.current, appointment_time: appointmentTimeRef.current, doctor_name: doctorNameRef.current, patient_name: patientNameRef.current, patient_id: patientIdRef.current, counter_number: counterNumberRef.current, userid: emailRef.current }), // Accessing from component state
          });
        
          const json = await result.text();
          // setVideoName(video_url);
          // if (videoName !== null) {
            
          // setShowPopup(true);}


          return json;
        }
      );

      // Set up event listeners
      openAIClientRef.current.on(
        "conversation.updated",
        handleConversationUpdate
      );

      openAIClientRef.current.on(
        "conversation.interrupted",
        interruptConversation
      );

      openAIClientRef.current.on(
        "input_audio_buffer.speech_stopped",
        handleSpeechStopped
      );
      // openAIClientRef.current.on('response.canceled', handleResponseCanceled);

      
      await openAIClientRef.current.connect().then(() => {
        console.log("OpenAI Client connected successfully");
        openAIClientRef.current?.createResponse();
        startRecording();
      });

      setIsAvatarVisible(true);
    } catch (error: any) {
      console.error("Error initializing OpenAI client:", error);
      setError(`Failed to initialize OpenAI client: ${error.message}`);
    }
  }, [initialPrompt]);

  /**
   * Handles conversation updates, including user and assistant messages.
   */
  const handleConversationUpdate = useCallback((event: any) => {
    console.log("Conversation updated:", event);
    const { item, delta } = event;

    if (item.type === "message" && item.role === "assistant") {
      console.log("Assistant message detected");
      setAvatarTranscript(item.content[0].transcript);
      console.log("Assistant transcript:", item.content[0].transcript);
      if (delta && delta.audio) {
        const downsampledAudio = downsampleAudio(delta.audio, 24000, 16000);
        audioChunkQueueRef.current.push(downsampledAudio);
        if (!isProcessingChunkRef.current) {
          processNextAudioChunk();
        }
      }
    } else if (item.type === "message" && item.role === "user") {
      setUserMessage(item.content[0].transcript);
      console.log("User message detected:", item.content[0].transcript);
      // Update user transcript state
      setUserTranscript(item.content[0].transcript);
    }
  }, []);

  /**
   * Handles interruptions in the conversation flow.
   */
  const interruptConversation = () => {
    console.warn("User interrupted the conversation");
    simliClient?.ClearBuffer();
    openAIClientRef.current?.cancelResponse("");
  };

  /**
   * Processes the next audio chunk in the queue.
   */
  const processNextAudioChunk = useCallback(() => {
    if (
      audioChunkQueueRef.current.length > 0 &&
      !isProcessingChunkRef.current
    ) {
      isProcessingChunkRef.current = true;
      const audioChunk = audioChunkQueueRef.current.shift();
      if (audioChunk) {
        const chunkDurationMs = (audioChunk.length / 16000) * 1000; // Calculate chunk duration in milliseconds

        // Send audio chunks to Simli immediately
        simliClient?.sendAudioData(audioChunk as any);
        console.log(
          "Sent audio chunk to Simli:",
          chunkDurationMs,
          "Duration:",
          chunkDurationMs.toFixed(2),
          "ms"
        );
        isProcessingChunkRef.current = false;
        processNextAudioChunk();
      }
    }
  }, []);

  /**
   * Handles the end of user speech.
   */
  const handleSpeechStopped = useCallback((event: any) => {
    console.log("Speech stopped event received", event);
  }, []);

  /**
   * Applies a simple low-pass filter to prevent aliasing of audio
   */
  const applyLowPassFilter = (
    data: Int16Array,
    cutoffFreq: number,
    sampleRate: number
  ): Int16Array => {
    // Simple FIR filter coefficients
    const numberOfTaps = 31; // Should be odd
    const coefficients = new Float32Array(numberOfTaps);
    const fc = cutoffFreq / sampleRate;
    const middle = (numberOfTaps - 1) / 2;

    // Generate windowed sinc filter
    for (let i = 0; i < numberOfTaps; i++) {
      if (i === middle) {
        coefficients[i] = 2 * Math.PI * fc;
      } else {
        const x = 2 * Math.PI * fc * (i - middle);
        coefficients[i] = Math.sin(x) / (i - middle);
      }
      // Apply Hamming window
      coefficients[i] *=
        0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (numberOfTaps - 1));
    }

    // Normalize coefficients
    const sum = coefficients.reduce((acc, val) => acc + val, 0);
    coefficients.forEach((_, i) => (coefficients[i] /= sum));

    // Apply filter
    const result = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < numberOfTaps; j++) {
        const idx = i - j + middle;
        if (idx >= 0 && idx < data.length) {
          sum += coefficients[j] * data[idx];
        }
      }
      result[i] = Math.round(sum);
    }

    return result;
  };

  /**
   * Downsamples audio data from one sample rate to another using linear interpolation
   * and anti-aliasing filter.
   *
   * @param audioData - Input audio data as Int16Array
   * @param inputSampleRate - Original sampling rate in Hz
   * @param outputSampleRate - Target sampling rate in Hz
   * @returns Downsampled audio data as Int16Array
   */
  const downsampleAudio = (
    audioData: Int16Array,
    inputSampleRate: number,
    outputSampleRate: number
  ): Int16Array => {
    if (inputSampleRate === outputSampleRate) {
      return audioData;
    }

    if (inputSampleRate < outputSampleRate) {
      throw new Error("Upsampling is not supported");
    }

    // Apply low-pass filter to prevent aliasing
    // Cut off at slightly less than the Nyquist frequency of the target sample rate
    const filteredData = applyLowPassFilter(
      audioData,
      outputSampleRate * 0.45, // Slight margin below Nyquist frequency
      inputSampleRate
    );

    const ratio = inputSampleRate / outputSampleRate;
    const newLength = Math.floor(audioData.length / ratio);
    const result = new Int16Array(newLength);

    // Linear interpolation
    for (let i = 0; i < newLength; i++) {
      const position = i * ratio;
      const index = Math.floor(position);
      const fraction = position - index;

      if (index + 1 < filteredData.length) {
        const a = filteredData[index];
        const b = filteredData[index + 1];
        result[i] = Math.round(a + fraction * (b - a));
      } else {
        result[i] = filteredData[index];
      }
    }

    return result;
  };

  /**
   * Starts audio recording from the user's microphone.
   */
  const startRecording = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }

    try {
      console.log("Starting audio recording...");
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const source = audioContextRef.current.createMediaStreamSource(
        streamRef.current
      );
      processorRef.current = audioContextRef.current.createScriptProcessor(
        2048,
        1,
        1
      );

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const audioData = new Int16Array(inputData.length);
        let sum = 0;

        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          audioData[i] = Math.floor(sample * 32767);
          sum += Math.abs(sample);
        }

        openAIClientRef.current?.appendInputAudio(audioData);
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      setIsRecording(true);
      console.log("Audio recording started");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Error accessing microphone. Please check your permissions.");
    }
  }, []);

  /**
   * Stops audio recording from the user's microphone
   */
  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    console.log("Audio recording stopped");
  }, []);

  /**
   * Handles the start of the interaction, initializing clients and starting recording.
   */
  const handleStart = useCallback(async () => {
    setIsLoading(true);
    setError("");
    onStart();

    try {
      console.log("Starting...");
      initializeSimliClient();
      await simliClient?.start();
      eventListenerSimli();
    } catch (error: any) {
      console.error("Error starting interaction:", error);
      setError(`Error starting interaction: ${error.message}`);
    } finally {
      setIsAvatarVisible(true);
      setIsLoading(false);
    }
  }, [onStart]);

  /**
   * Handles stopping the interaction, cleaning up resources and resetting states.
   */
  const handleStop = useCallback(() => {
    console.log("Stopping interaction...");
    setIsLoading(false);
    setError("");
    stopRecording();
    setIsAvatarVisible(false);
    simliClient?.close();
    openAIClientRef.current?.disconnect();
    if (audioContextRef.current) {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }
    stopRecording();
    onClose();
    console.log("Interaction stopped");
  }, [stopRecording]);

  /**
   * Simli Event listeners
   */
  const eventListenerSimli = useCallback(() => {
    if (simliClient) {
      simliClient?.on("connected", () => {
        console.log("SimliClient connected");
        // Initialize OpenAI client
        initializeOpenAIClient();
      });

      simliClient?.on("disconnected", () => {
        console.log("SimliClient disconnected");
        openAIClientRef.current?.disconnect();
        if (audioContextRef.current) {
          audioContextRef.current?.close();
        }
      });
    }
  }, []);


  return (
    <>
      {/* Fullscreen Background Video Layer */}
      {isAvatarVisible && videoName && (
        <video
          src={`${videoName}`}
          autoPlay
          onEnded={() => setVideoName(null)}
          className="fixed inset-0 z-0 w-full h-full object-cover transition-all duration-700 ease-in-out "
        />
      )}
  
      {/* Avatar Wrapper - Responsive Stage */}
      <div
        className={cn(
          "transition-all duration-700 ease-in-out z-50",
          isAvatarVisible && videoName
            ? "fixed bottom-4 right-4 w-[400px] h-[400px] bg-black/10 rounded-xl flex items-center justify-center overflow-hidden shadow-xl"
            : "flex justify-center items-center h-[calc(100vh-150px)] w-full relative"
        )}
      >
        <div
          className={cn(
            "transition-transform duration-700 ease-in-out",
            isAvatarVisible && videoName
              ? "scale-75 origin-center"
              : "scale-100"
          )}
        >
          <VideoBox video={videoRef} audio={audioRef} />
        </div>
      </div>
  
      {/* Close Button for Video */}
      {isAvatarVisible && videoName && (
        <button
          onClick={() => setVideoName(null)}
          className="fixed top-4 right-4 text-white bg-black/50 hover:bg-black rounded-full px-3 py-1 text-xl z-50 transition-all duration-300"
        >
          ✕
        </button>
      )}
  
     {/* Interaction Buttons */}
<div className="flex flex-col items-center z-10 relative">
  {!isAvatarVisible ? (
    <>
      {/* Email Form */}
      <form className="w-full flex flex-col items-center" onSubmit={handleEmailSubmit}>
        <label htmlFor="email" className="text-white mb-2 font-abc-repro-mono font-bold">
          Enter your email:
        </label>
        <input
          
          id="email"
          name="email"
          required
          className="w-full h-[40px] px-4 mb-4 rounded-[8px] text-black"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="submit"
          className="w-full h-[40px] bg-simliblue text-white rounded-[8px] transition-all duration-300 hover:bg-white hover:text-black"
        >
          Submit
        </button>
      </form>

      {/* Test Interaction Button */}
      
      <button
        onClick={handleStart}
        disabled={isLoading}
        className={cn(
          "w-full h-[52px] mt-4 disabled:bg-[#343434] disabled:text-white disabled:hover:rounded-[100px] bg-simliblue text-white py-3 px-6 rounded-[100px] transition-all duration-300 hover:text-black hover:bg-white hover:rounded-sm",
          "flex justify-center items-center"
        )}
      >
        {isLoading ? (
          <IconSparkleLoader className="h-[20px] animate-loader" />
        ) : (
          <span className="font-abc-repro-mono font-bold w-[164px]">
            Test Interaction
          </span>
        )}
      </button>
    </>
  ) : (
          <div className="flex flex-col items-center gap-4 w-full mt-4">
            <h1>
              <span className="text-white font-abc-repro-mono font-bold text-lg">
                {userTranscriptRef.current || ""}
              </span>
              
            </h1>
            <h2 className="text-white font-abc-repro-mono text-sm">
              {avatarTranscriptRef.current || "Waiting for response..."}
            </h2>
            <h3 className="text-white font-abc-repro-mono text-sm">
              {openAIClientRef.current?.isConnected()
                ? "Connected 🟢"
                : "Disconnected 🔴"}
            </h3>
            <button
              onClick={() => {
                handleStop();
                setVideoName(null);
              }}
              className="group text-white flex-grow bg-red hover:rounded-sm hover:bg-white h-[52px] px-6 rounded-[100px] transition-all duration-300"
            >
              <span className="font-abc-repro-mono group-hover:text-black font-bold w-[164px] transition-all duration-300">
                Stop Interaction
              </span>
            </button>
            <h3 className="text-white font-abc-repro-mono font-bold text-lg">
              {emailRef.current ? `Email: ${emailRef.current}` : "No email provided"}
            </h3>
                        <div className="grid grid-cols-3 gap-2 border border-white/20 p-4 rounded-lg w-full divide-x divide-y divide-white/20">
  <h3 className="text-white font-abc-repro-mono text-sm px-2 py-1">
    {ticketNumberRef.current ? `Ticket Number: ${ticketNumberRef.current}` : "No ticket number provided"}
  </h3>
  <h3 className="text-white font-abc-repro-mono text-sm px-2 py-1">
    {appointmentDateRef.current ? `Appointment Date: ${appointmentDateRef.current}` : "No appointment date provided"}
  </h3>
  <h3 className="text-white font-abc-repro-mono text-sm px-2 py-1">
    {appointmentTimeRef.current ? `Appointment Time: ${appointmentTimeRef.current}` : "No appointment time provided"}
  </h3>
  <h3 className="text-white font-abc-repro-mono text-sm px-2 py-1">
    {doctorNameRef.current ? `Doctor Name: ${doctorNameRef.current}` : "No doctor name provided"}
  </h3>
  <h3 className="text-white font-abc-repro-mono text-sm px-2 py-1">
    {patientNameRef.current ? `Patient Name: ${patientNameRef.current}` : "No patient name provided"}
  </h3>
  <h3 className="text-white font-abc-repro-mono text-sm px-2 py-1">
    {patientIdRef.current ? `Patient ID: ${patientIdRef.current}` : "No patient ID provided"}
  </h3>
  <h3 className="text-white font-abc-repro-mono text-sm px-2 py-1">
    {counterNumberRef.current ? `Counter Number: ${counterNumberRef.current}` : "No counter number provided"}
  </h3>
</div>

            

          </div>
          
        )}
      </div>
    </>
  );
  


 
};

export default SimliOpenAI;
