import { redirect } from "next/navigation";

// Matches now live inline on the dashboard. Keep the route as a redirect so
// existing links (and the post-scoring flow) still land somewhere sensible.
export default function MatchesPage() {
  redirect("/dashboard");
}
