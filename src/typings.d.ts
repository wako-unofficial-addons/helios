interface Window {
  define: (name: string, deps: string[], definitionFn: () => any) => void;

  System: {
    import: (url) => Promise<any>;
    instantiate: (id, url) => Promise<any>
  };
}
