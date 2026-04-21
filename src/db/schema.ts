export interface TheaterRow {
  id: string;
  name: string;
  area: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface MovieRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ScreeningJoinedRow {
  id: string;
  movie_id: string;
  movie_title: string;
  theater_id: string;
  theater_name: string;
  screen_name: string | null;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  tags: string | null;
  target_date: string;
}

export interface TravelTimeRow {
  from_theater_id: string;
  to_theater_id: string;
  travel_minutes: number;
  updated_at: string;
}

export interface UserSettingsRow {
  id: string;
  buffer_minutes: number;
  enabled_theater_ids: string;
  updated_at: string;
}
