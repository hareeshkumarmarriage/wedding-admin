import { useEffect, useState } from "react";
import AdminActionFeedback, { type AdminFeedback, ADMIN_FEEDBACK_EVENT } from "./AdminActionFeedback";
import AdminControlCenter from "@/pages/AdminControlCenterSpec";

function classify(url: string, method: string) {
  const u=url.toLowerCase(); const m=method.toUpperCase();
  if(u.includes("admin-advanced?action=publish")) return {title:"Publishing changes…",message:"Updating the live website and recording a new published version."};
  if(u.includes("admin-advanced?action=rollback")) return {title:"Restoring version to Draft…",message:"Preparing the selected published version as a new Draft."};
  if(u.includes("admin-advanced?action=draft")) return {title:"Preparing Draft Preview…",message:"Creating a preview snapshot from your saved Draft."};
  if(u.includes("admin-users")&&m!=="GET") return {title:"Updating administration…",message:"Saving administrator changes."};
  if(u.includes("events")) return {title:m==="POST"?"Creating event…":"Saving event…",message:"Saving event changes to Draft."};
  if(u.includes("guestbook")) return {title:"Updating guestbook…",message:"Saving moderation changes."};
  if(u.includes("notifications")) return {title:m==="DELETE"?"Deleting notification…":"Saving notification…",message:"Updating notification settings."};
  if(u.includes("site_settings")) return {title:"Saving Draft…",message:"Saving the specification control to Draft."};
  if(u.includes("homepage_sections")) return {title:"Saving section layout…",message:"Saving website section visibility and order to Draft."};
  if(u.includes("profiles")||u.includes("admin_update_profile")) return {title:"Updating administrator profile…",message:"Saving administration changes."};
  if(m==="DELETE") return {title:"Deleting…",message:"Removing the selected item."};
  if(m==="PATCH"||m==="PUT"||m==="POST") return {title:"Saving changes…",message:"Processing your request."};
  return null;
}
export default function AdminFeedbackShell(){
 const [feedback,setFeedback]=useState<AdminFeedback|null>(null);
 useEffect(()=>{const onFeedback=(event:Event)=>setFeedback((event as CustomEvent<AdminFeedback>).detail);window.addEventListener(ADMIN_FEEDBACK_EVENT,onFeedback);const originalFetch=window.fetch.bind(window);window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{const url=typeof input==="string"?input:input instanceof URL?input.toString():input.url;const method=init?.method||(typeof input!=="string"&&!(input instanceof URL)?input.method:"GET");const action=classify(url,method);if(action)setFeedback({kind:"loading",...action});try{const response=await originalFetch(input,init);if(action)setFeedback(response.ok?{kind:"success",title:action.title.includes("Publish")?"Published successfully.":"Saved successfully.",message:action.title.includes("Publish")?"The Draft is now live.":"Your changes are saved.",duration:5000}:{kind:"error",title:"Action failed.",message:`Request failed (HTTP ${response.status}).`,duration:9000});return response}catch(error){if(action)setFeedback({kind:"error",title:"Connection error.",message:error instanceof Error?error.message:"The request could not reach the server.",duration:9000});throw error}};return()=>{window.fetch=originalFetch;window.removeEventListener(ADMIN_FEEDBACK_EVENT,onFeedback)}},[]);
 return <><AdminControlCenter/><AdminActionFeedback feedback={feedback} onClose={()=>setFeedback(null)}/></>;
}
