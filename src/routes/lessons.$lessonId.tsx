import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Chess } from "chess.js";
import { ArrowLeft, BookOpen } from "lucide-react";
import { lessonService } from "@/services/lessonService";
import { EmptyState } from "@/components/academy/empty-state";
import { InteractiveBoard } from "@/components/chess/interactive-board";
import { tryMove } from "@/lib/chess-logic";
import { pageHead } from "@/lib/metadata";
import type { Lesson } from "@/types/academy";
export const Route = createFileRoute("/lessons/$lessonId")({
  head: ({ params }) =>
    pageHead(
      `Lesson library · ${params.lessonId.replace(/-/g, " ")}`,
      "Chess lessons with explanations and an interactive board.",
    ),
  component: LessonPage,
});
function LessonPage() {
  const { lessonId } = Route.useParams();
  const lesson = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => lessonService.get(lessonId),
    retry: false,
  });
  const categories = useQuery({ queryKey: ["categories"], queryFn: lessonService.categories });
  const list = useQuery({
    queryKey: ["lessons", lessonId],
    queryFn: () => lessonService.list(lessonId),
  });
  const category = categories.data?.find((item) => item.id === lessonId);
  return (
    <div className="page">
      <Link className="breadcrumb" to="/learn">
        <ArrowLeft className="size-4" />
        Back to lessons
      </Link>
      <div className="page-heading mt-6">
        <h1>{lesson.data?.title ?? category?.name ?? "Lessons"}</h1>
      </div>
      {lesson.data ? (
        <LessonWorkspace key={lesson.data.id} lesson={lesson.data} />
      ) : list.data?.length ? (
        <div className="category-grid">
          {list.data.map((item) => (
            <Link
              className="category-card"
              key={item.id}
              to="/lessons/$lessonId"
              params={{ lessonId: item.id }}
            >
              <h2>{item.title}</h2>
              <span className="category-link">Start lesson</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="workspace">
          <div className="board-column">
            <div className="board-empty">
              <div className="board-empty-label">
                <BookOpen />
              </div>
            </div>
          </div>
          <EmptyState
            loading={lesson.isLoading || list.isLoading}
            error={lesson.isError || list.isError}
            title={
              lesson.isError || list.isError
                ? "Lessons couldn’t load"
                : "No lessons yet. They're on the way."
            }
            description=""
            retry={() => {
              void lesson.refetch();
              void list.refetch();
            }}
          />
        </div>
      )}
    </div>
  );
}
function LessonWorkspace({ lesson }: { lesson: Lesson }) {
  const [game] = useState(() => new Chess(lesson.fen));
  const [position, setPosition] = useState(game.fen());
  return (
    <div className="workspace">
      <div className="board-column">
        <InteractiveBoard
          game={game}
          position={position}
          onMove={(from, to, promotion) => {
            const move = tryMove(game, from, to, promotion);
            if (move) setPosition(game.fen());
            return Boolean(move);
          }}
        />
      </div>
      <article className="lesson-copy">
        {lesson.explanation.split("\n").map((paragraph, index) => (
          <p className="mb-4" key={index}>
            {paragraph}
          </p>
        ))}
      </article>
    </div>
  );
}
