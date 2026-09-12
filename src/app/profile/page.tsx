import { readWorkingMemory } from "@/lib/working-memory/store";
import { ProfileView } from "./ProfileView";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const memory = await readWorkingMemory();
  const resume = memory.resume
    ? {
        fileName: memory.resume.fileName,
        fileType: memory.resume.fileType,
        size: memory.resume.size,
        uploadedAt: memory.resume.uploadedAt,
      }
    : null;

  return <ProfileView resume={resume} profile={memory.profile} />;
}