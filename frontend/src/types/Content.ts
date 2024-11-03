export interface ModMenuContent {
  id: number;
  name: string;
  score: number;
  date: string;
  showcase: string;
  description: string;
  category_id: number;
};

export interface MapDiscussionContent {
  title: string;
  content: string;
};

export interface MapDiscussionCommentContent {
  comment: string;
};

export interface UploadRunContent {
  map_id: number;
  host_demo: File | null;
  partner_demo: File | null;
};
