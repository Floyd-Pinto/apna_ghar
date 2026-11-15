/** Project as returned by the list endpoint (/api/projects/projects/). */
export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  developer_name: string;
  city: string;
  state: string;
  starting_price: string;
  status: string;
  project_type: string;
  cover_image: string;
  total_units: number;
  available_units: number;
  verified: boolean;
  verification_score: string;
  amenities: string[];
  expected_completion: string;
  views_count: number;
  interested_count: number;
  average_rating: number;
  total_reviews: number;
}
