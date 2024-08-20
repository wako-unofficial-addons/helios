export interface ProviderQueryInfo {
  query: string;
  keywords: string | string[];
}

export interface ProviderQueryReplacement {
  title: string;
  titleFirstLetter: string;
  imdbId: string;
  token: string;
  episodeCode: string;
  seasonCode: string;
  year: string;
  season: string;
  episode: string;
  query: string;

  [key: string]: string;
}

export interface Provider {
  name: string;
  enabled: boolean;
  languages: string[];
  base_url: string;
  fallback_urls?: string[];
  response_type: 'json' | 'text';
  http_method?: 'GET' | 'POST';
  trust_movie_results?: boolean; // If true then we don't check filename to know if the result is good
  trust_episode_results?: boolean; // If true then we don't check filename to know if the result is good
  trust_anime_results?: boolean; // If true then we don't check filename to know if the result is good
  time_to_wait_between_each_request_ms?: number; // In list mode we're gonna do request on all visible media
  time_to_wait_on_too_many_request_ms?: number;
  timeout_ms?: number;
  token?: {
    // If we need to store a token for each request
    query: string;
    token_validity_time_ms?: number;
    token_format: {
      token: string;
    };
  };
  title_replacement?: { [key: string]: string }; // Object off char to replace by
  separator?: string; // words separator
  movie?: ProviderQueryInfo;
  episode?: ProviderQueryInfo;
  season?: ProviderQueryInfo;
  anime?: ProviderQueryInfo;
  json_format?: {
    results?: string;
    sub_results?: string;
    url?: string;
    title: string;
    seeds: string;
    peers: string;
    size: string;
    quality?: string;
    isPackage?: string;
    hash?: string;
  };
  html_parser?: {
    row: string;
    url: string;
    title: string;
    seeds: string;
    peers: string;
    size: string;
    isPackage?: string;
    hash?: string;
  };
  source_is_in_sub_page?: boolean;
}

export interface ProviderList {
  [key: string]: Provider;
}

export const testProviders: ProviderList = {};

console.log('testProviders', JSON.stringify(testProviders));

export const fixProvider = (provider: Provider) => {
  if (!provider.name) {
    provider.name = 'Unknown';
  }

  if (!provider.enabled) {
    provider.enabled = false;
  }

  if (!provider.languages) {
    provider.languages = [];
  }
  if (!provider.base_url) {
    provider.base_url = 'https://google.com';
  }
};
