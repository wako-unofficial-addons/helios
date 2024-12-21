# Start the project locally

Run the following step

- Clone the project
- Install dependencies: `npm i`
- Start the project: `npm start`

Now the easiest way to test it, is to open Chrome in [debug mode](https://code.visualstudio.com/Docs/editor/debugging) using [vscode](https://code.visualstudio.com/). From the **Run And Debug** menu chose `Helios` and click the **play** icon

# Default provider

By default, Helios doesn't come with any provider installed, but you can install the default one by adding this URL: https://pastebin.com/raw/9U5MMr1J  
This is the provider for [Legit Torrents](http://www.legittorrents.info) (100% Legally Free Media).

# Create your own provider

If you'd like to know how providers work and create your own, read the [wiki](https://github.com/wako-unofficial-addons/helios/wiki/Providers)

# Test your own provider

Run the project locally, open `projects/plugin/src/plugin/entities/provider.ts` and set the constant `testProviders` with your own provider(s), i.e:

```ts
export const testProviders: ProviderList = {
  myProvider: {
    name: 'My Provider',
    enabled: true,
    languages: ['en'],
    base_url: 'http://www.myprovider.com',
    response_type: 'text',
    movie: {
      query: '&search={query}&category=1',
      keywords: '{title} ',
    },
    html_parser: {
      row: "doc.querySelectorAll('#bodyarea tr table:nth-child(3) table.lista tr')",
      title: "row.querySelector('td:nth-child(2) a').textContent",
      peers: "row.querySelector('td:nth-child(6)').textContent",
      seeds: "row.querySelector('td:nth-child(5)').textContent",
      size: null,
      url: "row.querySelector('td:nth-child(3) a').getAttribute('href')",
    },
  },
};
```

# Test on your phone

If you want to test the add-on on wako on your phone follow the instructions: https://github.com/wako-app/addon-starter-kit#test-your-add-on. You'll first have to change the URLs in the manifest are they're absolute URLs pointing here, so edit the [manifest](https://github.com/wako-unofficial-addons/helios/blob/master/projects/plugin/src/manifest.json) and replace `https://raw.githubusercontent.com/wako-unofficial-addons/helios/master/dist` by blank

# Provider Interface Documentation

> For detailed TypeScript interface documentation, see [provider.ts](projects/plugin/src/plugin/entities/provider.ts)

## Core Fields

| Field           | Type               | Description                                                    |
| --------------- | ------------------ | -------------------------------------------------------------- |
| `name`          | `string`           | Name of the provider displayed in the UI                       |
| `enabled`       | `boolean`          | Whether the provider is active and should be used for searches |
| `languages`     | `string[]`         | List of supported languages codes (e.g. ['en', 'fr'])          |
| `base_url`      | `string`           | Main URL of the provider                                       |
| `fallback_urls` | `string[]`         | Optional backup URLs if main URL fails                         |
| `response_type` | `'json' \| 'text'` | Expected response format from provider                         |

## Request Configuration

| Field                                  | Type              | Description                                      |
| -------------------------------------- | ----------------- | ------------------------------------------------ |
| `http_method`                          | `'GET' \| 'POST'` | HTTP method to use (defaults to GET)             |
| `timeout_ms`                           | `number`          | Request timeout in milliseconds (default: 15000) |
| `time_to_wait_between_each_request_ms` | `number`          | Delay between consecutive requests               |
| `time_to_wait_on_too_many_request_ms`  | `number`          | Wait time when rate limited                      |

## Search Configuration

| Field               | Type                        | Description                           |
| ------------------- | --------------------------- | ------------------------------------- |
| `movie`             | `ProviderQueryInfo`         | Search configuration for movies       |
| `episode`           | `ProviderQueryInfo`         | Search configuration for TV episodes  |
| `season`            | `ProviderQueryInfo`         | Search configuration for full seasons |
| `anime`             | `ProviderQueryInfo`         | Search configuration for anime        |
| `separator`         | `string`                    | Word separator in search queries      |
| `title_replacement` | `{ [key: string]: string }` | Characters to replace in titles       |

## Results Trust Settings

| Field                   | Type      | Description                             |
| ----------------------- | --------- | --------------------------------------- |
| `trust_movie_results`   | `boolean` | Skip filename verification for movies   |
| `trust_episode_results` | `boolean` | Skip filename verification for episodes |
| `trust_anime_results`   | `boolean` | Skip filename verification for anime    |

## Authentication

| Field   | Type          | Description                                    |
| ------- | ------------- | ---------------------------------------------- |
| `token` | `TokenConfig` | Token configuration for authenticated requests |

## Parser Configuration

| Field                   | Type         | Description                                   |
| ----------------------- | ------------ | --------------------------------------------- |
| `json_format`           | `JsonFormat` | JSON response parsing configuration           |
| `html_parser`           | `HtmlParser` | HTML response parsing configuration           |
| `source_is_in_sub_page` | `boolean`    | Whether torrent URL requires a second request |

### JSON Format Fields

```typescript
{
  results?: string;         // Path to results array
  sub_results?: string;     // Path to nested results
  url?: string;            // Path to torrent/magnet URL
  title: string;           // Path to title field
  seeds: string;           // Path to seeds count
  peers: string;           // Path to peers count
  size: string;            // Path to file size
  quality?: string;        // Path to quality info
  isPackage?: string;      // Path to season pack indicator
  hash?: string;           // Path to torrent hash
}
```

### HTML Parser Fields

```typescript
{
  row: string;             // Selector for result rows
  url: string;             // Selector for torrent/magnet URL
  title: string;           // Selector for title
  seeds: string;           // Selector for seeds count
  peers: string;           // Selector for peers count
  size: string;            // Selector for file size
  isPackage?: string;      // Selector for season pack indicator
  hash?: string;           // Selector for torrent hash
}
```

## Example Provider Configuration

```typescript
{
  name: 'Example Provider',
  enabled: true,
  languages: ['en'],
  base_url: 'https://example.com',
  response_type: 'json',
  movie: {
    query: '/search?q={query}&cat=movies',
    keywords: '{title} {year}'
  },
  json_format: {
    results: 'data.results',
    title: 'name',
    url: 'magnet',
    seeds: 'seeders',
    peers: 'leechers',
    size: 'size'
  }
}
```
