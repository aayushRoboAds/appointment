"use client";
import React, { use, useEffect, useState } from "react";
import SimliOpenAI from "./SimliOpenAI";
import DottedFace from "./Components/DottedFace";
import SimliHeaderLogo from "./Components/Logo";
import Navbar from "./Components/Navbar";
import Image from "next/image";
import GitHubLogo from "@/media/github-mark-white.svg";

interface avatarSettings {
  name: string;
  openai_voice: "alloy"|"ash"|"ballad"|"coral"|"echo"|"sage"|"shimmer"|"verse";
  openai_model: string;
  simli_faceid: string;
  initialPrompt: string;
}

// Customize your avatar here
const avatar: avatarSettings = {
  name: "Mohammad",
  openai_voice: "ash",
  openai_model: "gpt-4o-realtime-preview-2024-12-17", // Use "gpt-4o-mini-realtime-preview-2024-12-17" for cheaper and faster responses or gpt-4o-realtime-preview-2024-12-17
  simli_faceid: "59ad47ad-a41b-4945-8067-c39c24b7a531",
  initialPrompt:
  "You are a receptionist at a hospital responsible for setting appointments for patients. Start by searching for patient details using the email in the knowledge base, Find patient id.ASK FOR PATIENT NAME. After getting the current users name. We have the following doctors, ask to choose one Options: Dr. Smith, Dr. Johnson, and Dr. Rajesh Gupta. Ask the user for their name. After confirmation from the user, ask the user for their preferred date and time for the appointment. If the user asks about available slots, you can provide random time slots.  Lastly generate a random counter number. Once you have all the info, finalize the appointment"

  ,
  //" You are hiring and you have to take interview of the user. ASK ONE BY ONE AND GIVE TIME and CHANCE TO ANSWER. You have to ask questions to the user and record their answers. First,greet the user then Fetch all the questions using get_question_set tool, then use these to ask the user. After the interview, send back the questions, answers given and final score using tool set_final_score. You can ask few follow up questions if needed. You can also cross question if answer is not clear. ",
   // "Current userid is 'aa'. You are a friendly and helpful pizza shopping assistant. You are designed to assist users with their queries and provide information about the products in the knowledge base. While searching for information, use filler words like 'um' and 'uh' to make your speech sound more natural. Provide information when you are searching and speak our as you recieve the information. ",
    //"You are a real estate agent. You have to find details about the properties in the knowledge base. You have to send query and user ID to RAG and fetch answer to speak and video to play. You are friendly and helpful. Current user ID is 'kb-n'. You are designed to assist users with their queries and provide information about the products in the knowledge base. While searching for information, use filler words like 'um' and 'uh' to make your speech sound more natural. Provide information when you are searching and speak out as you receive the information.",
    //"Current userid is 'test user' You are a technical examination. Focus on asking questions and do not explain and provide the answers. You have to ask questions to the user and record their answers. Search the questions in the knowledge base and ask them one by one. You can ask follow up questions if needed. You can cross question if answer is not clear. After the questionnaire, Give feedback to the user and how they can improve. Point out their wrong answers.",
};

const Demo: React.FC = () => {
  const [showDottedFace, setShowDottedFace] = useState(true);

  const onStart = () => {
    console.log("Setting setshowDottedface to false...");
    setShowDottedFace(false);
  };

  const onClose = () => {
    console.log("Setting setshowDottedface to true...");
    setShowDottedFace(true);
  };

  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center font-abc-repro text-sm text-white p-8">
      {/* 
        If you'd like a custom logo at the top, uncomment and place your logo component:
        
        <div className="my-6">
          <Image
            src={MyCustomLogo}
            alt="Custom Logo"
            width={150}
            height={50}
            priority
            className="mx-auto"
          />
        </div>
      */}

      <div className="flex flex-col items-center gap-6 bg-effect15White p-6 pb-[40px] rounded-xl w-full">
      <SimliOpenAI
        openai_voice={avatar.openai_voice}
        openai_model={avatar.openai_model}
        simli_faceid={avatar.simli_faceid}
        initialPrompt={avatar.initialPrompt}
        onStart={onStart}
        onClose={onClose}
        showDottedFace={showDottedFace}
      />
    </div>
  </div>
);
};

export default Demo;
