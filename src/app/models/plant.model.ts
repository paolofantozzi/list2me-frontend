export interface PlantSearchResult {
  title: string;
  subtitle: string | null;
  image_url: string | null;
  /** Sempre vuoto: Perenual non ha una pagina pubblica stabile per specie. */
  service_url: string;
  metadata: {
    perenual_id: number | null;
    common_name: string;
    scientific_name: string[];
    other_names: string[];
    cycle: string;
    watering: string;
    sunlight: string[];
    image_url: string | null;
  };
}

export interface PlantSpecies {
  perenual_id: number | null;
  common_name: string;
  scientific_name: string[];
  other_names: string[];
  family: string;
  origin: string[];
  description: string;
  cycle: string;
  watering: string;
  watering_benchmark: string;
  sunlight: string[];
  growth_rate: string;
  maintenance: string;
  care_level: string;
  drought_tolerant: boolean;
  salt_tolerant: boolean;
  thorny: boolean;
  invasive: boolean;
  tropical: boolean;
  indoor: boolean;
  edible_fruit: boolean;
  edible_leaf: boolean;
  medicinal: boolean;
  poisonous_to_humans: boolean;
  poisonous_to_pets: boolean;
  image_url: string | null;
}
