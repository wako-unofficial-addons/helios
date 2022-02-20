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

If you'd like to know how providers work and create your own, read the [wiki](https://github.com/cakirmehmete/helios/wiki/Providers)

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
      keywords: '{title} '
    },
    html_parser: {
      row: "doc.querySelectorAll('#bodyarea tr table:nth-child(3) table.lista tr')",
      title: "row.querySelector('td:nth-child(2) a').textContent",
      peers: "row.querySelector('td:nth-child(6)').textContent",
      seeds: "row.querySelector('td:nth-child(5)').textContent",
      size: null,
      url: "row.querySelector('td:nth-child(3) a').getAttribute('href')"
    }
  }
};
```

# Test on your phone

If you want to test the add-on on wako on your phone follow the instructions: https://github.com/wako-app/addon-starter-kit#test-your-add-on. You'll first have to change the URLs in the manifest are they're absolute URLs pointing here, so edit the [manifest](https://github.com/cakirmehmete/helios/blob/master/projects/plugin/src/manifest.json) and replace `https://raw.githubusercontent.com/cakirmehmete/helios/master/dist` by blank
