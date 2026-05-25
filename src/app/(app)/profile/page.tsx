"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { ParsedResume } from "@/lib/db/schema";

interface ProfileData {
  user: {
    id: string;
    email: string;
    avatarUrl: string | null;
    avatarSource: string | null;
    avatarOptions: Record<string, string>;
    createdAt: string;
  };
  resume: {
    id: string;
    name: string;
    parsedData: ParsedResume | null;
    createdAt: string;
  } | null;
  documents: {
    id: string;
    type: string;
    title: string;
    sourceUrl: string | null;
    rawText: string;
    createdAt: string;
  }[];
  stats: {
    matches: number;
    documents: number;
  };
}

// Parse the GitHub scraped text into structured data
function parseGitHubText(rawText: string) {
  const lines = rawText.split("\n");
  const data: {
    username?: string;
    name?: string;
    bio?: string;
    company?: string;
    languages?: string[];
    publicRepos?: string;
    topRepos: { name: string; description?: string; language?: string; stars?: string }[];
  } = { topRepos: [] };

  let inRepos = false;
  for (const line of lines) {
    if (line.startsWith("GitHub: ")) data.username = line.replace("GitHub: ", "");
    else if (line.startsWith("Name: ")) data.name = line.replace("Name: ", "");
    else if (line.startsWith("Bio: ")) data.bio = line.replace("Bio: ", "");
    else if (line.startsWith("Company: ")) data.company = line.replace("Company: ", "");
    else if (line.startsWith("Languages: ")) data.languages = line.replace("Languages: ", "").split(", ");
    else if (line.startsWith("Public repos: ")) data.publicRepos = line.replace("Public repos: ", "");
    else if (line.startsWith("Top repositories:")) {
      inRepos = true;
    } else if (line.startsWith("--- README:")) {
      inRepos = false;
    } else if (inRepos && line.trim()) {
      const match = line.match(/^([^:]+?)(?:: (.+?))?\s*(?:\[(\w+)]\s*)?(?:\((\d+) stars\))?$/);
      if (match) {
        data.topRepos.push({
          name: match[1].trim(),
          description: match[2]?.trim(),
          language: match[3],
          stars: match[4],
        });
      }
    }
  }
  return data;
}

function SectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        Failed to load profile.
      </div>
    );
  }

  const { user, resume, documents: docs, stats } = data;
  const parsed = resume?.parsedData;
  const githubDoc = docs.find((d) => d.type === "github");
  const linkedinDoc = docs.find((d) => d.type === "linkedin");
  const portfolioDocs = docs.filter((d) => !["github", "linkedin", "resume"].includes(d.type));
  const githubData = githubDoc ? parseGitHubText(githubDoc.rawText) : null;
  const avatarUrl = user.avatarUrl;

  const displayName = parsed?.name || user.email;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  const allSkills = parsed
    ? [
        ...parsed.skills.languages,
        ...parsed.skills.frameworks,
        ...parsed.skills.tools,
        ...parsed.skills.databases,
        ...parsed.skills.cloud,
        ...parsed.skills.other,
      ]
    : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your Profile</h1>

      {/* Identity card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-5">
            <Avatar className="h-20 w-20">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold">{displayName}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {parsed && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="capitalize">
                    {parsed.seniority_level}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {parsed.years_of_experience} years experience
                  </span>
                </div>
              )}
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span>{stats.matches} matches</span>
                <span>{stats.documents} documents</span>
                <span>Member since {memberSince}</span>
              </div>
            </div>
          </div>

          {/* Avatar sources */}
          {Object.keys(user.avatarOptions).length > 1 && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Profile photos</p>
                <div className="flex gap-3">
                  {Object.entries(user.avatarOptions).map(([source, url]) => (
                    <div key={source} className="flex flex-col items-center gap-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={url} alt={source} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {source[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {source}
                        {user.avatarSource === source && " *"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Skills from resume */}
      {parsed && allSkills.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {parsed.skills.languages.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Languages</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.skills.languages.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {parsed.skills.frameworks.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Frameworks</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.skills.frameworks.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {parsed.skills.databases.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Databases</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.skills.databases.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {parsed.skills.cloud.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Cloud</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.skills.cloud.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {parsed.skills.tools.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Tools</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.skills.tools.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {parsed.skills.other.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Other</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.skills.other.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Experience from resume */}
      {parsed && parsed.experience.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {parsed.experience.map((exp, i) => (
              <div key={i} className={i > 0 ? "pt-4 border-t" : ""}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{exp.title}</p>
                    <p className="text-sm text-muted-foreground">{exp.company}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {exp.duration_months >= 12
                        ? `${Math.floor(exp.duration_months / 12)}y ${exp.duration_months % 12 ? `${exp.duration_months % 12}m` : ""}`
                        : `${exp.duration_months}m`}
                    </span>
                    {exp.industry && (
                      <Badge variant="secondary" className="text-[10px] ml-2">{exp.industry}</Badge>
                    )}
                  </div>
                </div>
                {exp.highlights.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {exp.highlights.map((h, j) => (
                      <li key={j} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-muted-foreground/50 shrink-0">-</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {exp.tech_used.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {exp.tech_used.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Education */}
      {parsed?.education && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Education</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{parsed.education.degree} in {parsed.education.field}</p>
            <p className="text-sm text-muted-foreground">{parsed.education.school}</p>
            {parsed.education.year > 0 && (
              <p className="text-xs text-muted-foreground mt-1">Class of {parsed.education.year}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Industries & standout signals */}
      {parsed && (parsed.industries_worked_in.length > 0 || parsed.standout_signals.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {parsed.industries_worked_in.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Industries</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.industries_worked_in.map((ind) => (
                    <Badge key={ind} variant="secondary" className="text-xs">{ind}</Badge>
                  ))}
                </div>
              </div>
            )}
            {parsed.standout_signals.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Standout signals</p>
                <ul className="space-y-1">
                  {parsed.standout_signals.map((s, i) => (
                    <li key={i} className="text-xs flex gap-2">
                      <span className="text-primary shrink-0">*</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* GitHub data */}
      {githubDoc && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">GitHub</CardTitle>
              {githubDoc.sourceUrl && (
                <a
                  href={githubDoc.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View profile
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {githubData ? (
              <>
                {githubData.name && (
                  <div className="flex items-center gap-2">
                    {user.avatarOptions.github && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarOptions.github} alt="GitHub" />
                        <AvatarFallback className="text-xs">GH</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <p className="text-sm font-medium">{githubData.name}</p>
                      {githubData.username && (
                        <p className="text-xs text-muted-foreground">@{githubData.username}</p>
                      )}
                    </div>
                  </div>
                )}
                {githubData.bio && (
                  <p className="text-sm text-muted-foreground">{githubData.bio}</p>
                )}
                {githubData.company && (
                  <p className="text-xs text-muted-foreground">
                    Company: {githubData.company}
                  </p>
                )}
                {githubData.publicRepos && (
                  <p className="text-xs text-muted-foreground">
                    {githubData.publicRepos} public repositories
                  </p>
                )}
                {githubData.languages && githubData.languages.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Languages</p>
                    <div className="flex flex-wrap gap-1.5">
                      {githubData.languages.map((lang) => (
                        <Badge key={lang} variant="outline" className="text-xs">{lang}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {githubData.topRepos.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Top repositories</p>
                    <div className="space-y-2">
                      {githubData.topRepos.map((repo) => (
                        <div key={repo.name} className="text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{repo.name}</span>
                            {repo.language && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{repo.language}</Badge>
                            )}
                            {repo.stars && Number(repo.stars) > 0 && (
                              <span className="text-[10px] text-muted-foreground">{repo.stars} stars</span>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{repo.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                GitHub profile linked. Raw data available.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* LinkedIn data */}
      {linkedinDoc && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">LinkedIn</CardTitle>
              {linkedinDoc.sourceUrl && (
                <a
                  href={linkedinDoc.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View profile
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {user.avatarOptions.linkedin && (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatarOptions.linkedin} alt="LinkedIn" />
                  <AvatarFallback className="text-xs bg-[#0077b5]/10 text-[#0077b5]">LI</AvatarFallback>
                </Avatar>
              )}
              <div>
                <p className="text-sm">
                  {linkedinDoc.title.replace("LinkedIn: ", "")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Profile linked {user.avatarOptions.linkedin ? "with photo" : "(photo unavailable)"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other linked documents */}
      {portfolioDocs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Linked Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {portfolioDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-[10px] capitalize shrink-0">{doc.type}</Badge>
                    <span className="text-sm truncate">{doc.title}</span>
                  </div>
                  {doc.sourceUrl && (
                    <a
                      href={doc.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline shrink-0 ml-2"
                    >
                      Open
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!parsed && !githubDoc && !linkedinDoc && portfolioDocs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No profile data yet. Upload a resume or link your GitHub/LinkedIn from the{" "}
              <a href="/dashboard" className="text-primary hover:underline">dashboard</a>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
