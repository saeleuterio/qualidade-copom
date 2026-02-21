export interface TeamShift {
  team: string;
  shift: string;
  totalOffered: number;
  totalReceived: number;
  totalLost: number;
  qualityScore: number;
  avgAnswerSpeed: number;
  satisfaction: number;
}

export interface DailyRecord {
  date: string;
  shifts: TeamShift[];
  totalOffered: number;
  totalReceived: number;
  totalLost: number;
}
