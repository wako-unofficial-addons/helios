import { TorrentSource } from './torrent-source';

/**
 * Information about how to build the search query for a specific media type
 */
export interface ProviderQueryInfo {
  /** The query string with placeholders (e.g. '/search?q={query}&cat=movies') */
  query: string;
  /** The template for building the search keywords. Can be a string or array of strings */
  keywords: string | string[];
}

/**
 * Available placeholders that can be used in query strings and keywords
 */
export interface ProviderQueryReplacement {
  /** The media title */
  title: string;
  /** First letter of the title */
  titleFirstLetter: string;
  /** IMDB ID (e.g. tt1234567) */
  imdbId: string;
  /** Authentication token if required */
  token: string;
  /** Episode code (e.g. S01E02) */
  episodeCode: string;
  /** Season code (e.g. S01) */
  seasonCode: string;
  /** Release year */
  year: string;
  /** Season number */
  season: string;
  /** Episode number */
  episode: string;
  /** Search query */
  query: string;

  /** Allow additional custom placeholders */
  [key: string]: string;
}

/**
 * Main provider configuration interface
 */
export interface Provider {
  /** Name displayed in the UI */
  name: string;
  /** Whether the provider is active */
  enabled: boolean;
  /** Supported language codes */
  languages: string[];
  /** Main provider URL */
  base_url: string;
  /** Fallback URLs if main URL fails */
  fallback_urls?: string[];
  /** Expected response format */
  response_type: 'json' | 'text';
  /** HTTP method to use */
  http_method?: 'GET' | 'POST';
  /** Skip filename verification for movies */
  trust_movie_results?: boolean;
  /** Skip filename verification for episodes */
  trust_episode_results?: boolean;
  /** Skip filename verification for anime */
  trust_anime_results?: boolean;
  /** Delay between requests in list mode */
  time_to_wait_between_each_request_ms?: number;
  /** Wait time when rate limited */
  time_to_wait_on_too_many_request_ms?: number;
  /** Request timeout */
  timeout_ms?: number;
  /** Authentication token configuration */
  token?: {
    /** URL to get token */
    query: string;
    /** Token validity duration */
    token_validity_time_ms?: number;
    /** How to extract token from response */
    token_format: {
      token: string;
    };
  };
  /** Characters to replace in titles */
  title_replacement?: { [key: string]: string };
  /** Word separator in search queries */
  separator?: string;
  /** Movie search configuration */
  movie?: ProviderQueryInfo;
  /** Episode search configuration */
  episode?: ProviderQueryInfo;
  /** Season search configuration */
  season?: ProviderQueryInfo;
  /** Anime search configuration */
  anime?: ProviderQueryInfo;
  /** JSON response parsing configuration */
  json_format?: {
    /** Path to results array */
    results?: string;
    /** Path to nested results */
    sub_results?: string;
    /** Path to torrent/magnet URL */
    url?: string;
    /** Path to title field */
    title: string;
    /** Path to seeds count */
    seeds: string;
    /** Path to peers count */
    peers: string;
    /** Path to file size */
    size: string;
    /** Path to quality info */
    quality?: string;
    /** Path to season pack indicator */
    isPackage?: string;
    /** Path to torrent hash */
    hash?: string;
  };
  /** HTML response parsing configuration */
  html_parser?: {
    /** Selector for result rows */
    row: string;
    /** Selector for torrent/magnet URL */
    url: string;
    /** Selector for title */
    title: string;
    /** Selector for seeds count */
    seeds: string;
    /** Selector for peers count */
    peers: string;
    /** Selector for file size */
    size: string;
    /** Selector for season pack indicator */
    isPackage?: string;
    /** Selector for torrent hash */
    hash?: string;
  };
  /** Whether torrent URL requires a second request */
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

export class ProviderResponse {
  url: string;
  method: 'GET' | 'POST';
  body?: any;
  error?: string;
  status: number;
  torrents: TorrentSource[];
  timeElapsed: number;
  skippedReason?: string;

  constructor({ url, method, body, error, status, torrents, timeElapsed, skippedReason }: ProviderResponse) {
    this.url = url;
    this.method = method;
    this.body = body;
    this.error = error;
    this.status = status;
    this.torrents = torrents;
    this.timeElapsed = timeElapsed;
    this.skippedReason = skippedReason;
  }
}
