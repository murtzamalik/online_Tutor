"use client";

import { useEffect, useState } from "react";
import * as w3 from "@/lib/api/w3";
import { parseTopics, readSession, readToken, type StudentTopic } from "./studentData";

/** Looks up a topic's name and mastery from the student's enrolment topics (best effort; null if unknown). */
export function useTopic(topicId: string | number | undefined): StudentTopic | null {
  const [topic, setTopic] = useState<StudentTopic | null>(null);
  useEffect(() => {
    const studentId = readSession("studentId");
    if (!studentId || topicId == null) return;
    let cancelled = false;
    w3.studentTopics(studentId, readToken())
      .then((r: unknown) => {
        if (cancelled) return;
        setTopic(parseTopics(r).find((t) => String(t.topicId) === String(topicId)) ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [topicId]);
  return topic;
}
