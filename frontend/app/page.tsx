import { redirect } from "next/navigation";

// Person 2 owns the candidate landing page. Until it lands, send / to the recruiter queue.
export default function Home() {
  redirect("/recruiter");
}
