import { redirect } from "next/navigation";

// Redirect root to the demo widget
export default function Home() {
  redirect("/widget/brightsmile-dental");
}
