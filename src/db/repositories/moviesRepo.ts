import type { Movie } from "../../domain/types";

export async function upsertMovies(db: D1Database, movies: Movie[], now: string): Promise<void> {
  if (!movies.length) {
    return;
  }

  await db.batch(
    movies.map((movie) =>
      db
        .prepare(
          `INSERT OR REPLACE INTO movies (
            id, title, created_at, updated_at
          ) VALUES (?, ?, COALESCE((SELECT created_at FROM movies WHERE id = ?), ?), ?)`,
        )
        .bind(movie.id, movie.title, movie.id, now, now),
    ),
  );
}
