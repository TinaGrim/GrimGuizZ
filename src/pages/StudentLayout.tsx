import { Outlet } from "react-router";
import ResumePrompt from "../components/ResumePrompt";

export default function StudentLayout() {
  return (
    <>
      <ResumePrompt />
      <Outlet />
    </>
  );
}
