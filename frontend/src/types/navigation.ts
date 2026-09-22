export type PageId =
  | 'home'
  | 'about'
  | 'features'
  | 'dashboard'
  | 'upload'
  | 'results'
  | 'evaluation'
  | 'dataset'
  | 'settings'
  | 'join';

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: string;
  participants: number;
  status: 'Completed' | 'Processing' | 'Failed';
  summary: string;
  confidence: number;
}
