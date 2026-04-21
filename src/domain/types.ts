export interface Theater {
  id: string;
  name: string;
  area: string;
  isActive?: boolean;
}

export interface Movie {
  id: string;
  title: string;
}

export interface Screening {
  id: string;
  movieId: string;
  movieTitle: string;
  theaterId: string;
  theaterName: string;
  screenName: string | null;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  tags: string[];
  targetDate: string;
}

export interface TravelTime {
  fromTheaterId: string;
  toTheaterId: string;
  travelMinutes: number;
}

export interface Settings {
  bufferMinutes: number;
  enabledTheaterIds: string[];
}

export interface SettingsView extends Settings {
  theaters: Theater[];
  travelTimes: TravelTime[];
}

export interface Itinerary {
  firstScreening: Screening;
  secondScreening: Screening;
  travelMinutes: number;
  waitMinutes: number;
  totalMinutes: number;
  score: number;
}

export interface ScreeningFilters {
  date: string;
  theaterIds?: string[];
  keyword?: string;
  tags?: string[];
  startTime?: string;
  endTime?: string;
}

export interface ItineraryFilters extends ScreeningFilters {
  bufferMinutes?: number;
  startScreeningId?: string;
}

export interface SettingsUpdateInput {
  bufferMinutes: number;
  enabledTheaterIds: string[];
  travelTimes?: TravelTime[];
}

export interface ImportPayload {
  theaters: Theater[];
  movies: Movie[];
  screenings: Array<{
    id: string;
    theaterId: string;
    movieId: string;
    screenName?: string | null;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    tags?: string[];
    targetDate: string;
  }>;
  travelTimes?: TravelTime[];
}

export interface ImportedCounts {
  theaters: number;
  movies: number;
  screenings: number;
  travelTimes: number;
}

export interface ApiMeta {
  count: number;
  date?: string;
  theaterIds?: string[];
  keyword?: string;
  tags?: string[];
  startTime?: string;
  endTime?: string;
  bufferMinutes?: number;
  startScreeningId?: string;
  availableTheaters?: Theater[];
  availableTags?: string[];
}
