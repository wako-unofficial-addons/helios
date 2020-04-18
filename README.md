# Default provider
By default, Helios doesn't come with any provider installed, but you can install the default one by adding this URL: https://pastebin.com/raw/9U5MMr1J  
This is the provider for [Legit Torrents](http://www.legittorrents.info) (100% Legally Free Media).


# Create your own provider
If you'd like to know how providers work and create your own, read the [wiki](https://github.com/wako-unofficial-addons/helios/wiki/Providers)


# Start the project locally
- Install dependencies: `npm i`
- Start the project: `npm start`
- Open chrome to `http://localhost:4200` with CORS disabled (follow instructions: https://alfilatov.com/posts/run-chrome-without-cors/)

If you want to test the add-on on wako on your phone follow the instructions: https://github.com/wako-app/addon-starter-kit#test-your-add-on. You'll first have to change the URLs in the manifest are they're absolute URLs pointing here, so edit the [manifest](https://github.com/wako-unofficial-addons/helios/blob/master/projects/plugin/src/manifest.json) and replace `https://raw.githubusercontent.com/wako-unofficial-addons/helios/master/dist` by blank
